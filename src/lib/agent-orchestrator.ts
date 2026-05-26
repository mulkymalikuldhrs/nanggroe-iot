// ============================================================
// NANGGROE IOT - Agent Orchestrator
// Central coordination layer for all multi-agent workflows
// Singleton pattern that persists across requests
// ============================================================

import { EventEmitter } from 'events'
import { db } from './db'
import type {
  AgentInstance,
  AgentState,
  AgentPriority,
  AgentTask,
  AgentMessage,
  AgentStatus,
} from './agents'
import { HermesAgent, PicoClawAgent } from './agents'
import { SentinelAgent } from './agents-sentinel'
import { NavigatorAgent } from './agents-navigator'
import { CommsGuardAgent } from './agents-comms'
import { DataStewardAgent } from './agents-data'

// ============================================================
// Orchestrator Types
// ============================================================

export interface AgentOrchestratorConfig {
  tickInterval: number // ms between orchestration cycles (default 5000)
  safetyMonitorInterval: number // ms between safety checks (default 2000)
  maxConcurrentAgents: number // max agents running simultaneously (default 6)
  autoRecovery: boolean // auto-restart crashed agents (default true)
}

export interface OrchestratorStatus {
  running: boolean
  uptime: number // seconds
  registeredAgents: string[]
  activeAgents: string[]
  taskQueueSize: number
  tasksCompleted: number
  tasksFailed: number
  messagesProcessed: number
  lastTick: Date | null
  config: AgentOrchestratorConfig
}

export interface AgentCommunicationLog {
  id: string
  from: string
  to: string
  type: string
  priority: AgentPriority
  payloadSummary: string
  timestamp: Date
}

const DEFAULT_CONFIG: AgentOrchestratorConfig = {
  tickInterval: 5000,
  safetyMonitorInterval: 2000,
  maxConcurrentAgents: 6,
  autoRecovery: true,
}

// ============================================================
// AgentOrchestrator — Singleton
// ============================================================

export class AgentOrchestrator {
  private static instance: AgentOrchestrator

  private agents: Map<string, AgentInstance> = new Map()
  private taskQueue: AgentTask[] = []
  private messageBus: EventEmitter
  private mainLoop: ReturnType<typeof setInterval> | null = null
  private running = false
  private startTime: Date | null = null
  private lastTick: Date | null = null
  private config: AgentOrchestratorConfig
  private _tasksCompleted = 0
  private _tasksFailed = 0
  private _messagesProcessed = 0
  private communicationLog: AgentCommunicationLog[] = []
  private maxCommLogSize = 200

  private constructor(config?: Partial<AgentOrchestratorConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.messageBus = new EventEmitter()
    this.messageBus.setMaxListeners(50) // Allow many agent listeners
  }

  static getInstance(config?: Partial<AgentOrchestratorConfig>): AgentOrchestrator {
    if (!AgentOrchestrator.instance) {
      AgentOrchestrator.instance = new AgentOrchestrator(config)
    }
    return AgentOrchestrator.instance
  }

  // ============================================================
  // Agent Registration
  // ============================================================

  registerAgent(agent: AgentInstance): void {
    if (this.agents.has(agent.name)) {
      console.warn(`[Orchestrator] Agent "${agent.name}" already registered, replacing`)
    }
    this.agents.set(agent.name, agent)

    // Set up message callback for inter-agent communication
    if ('setMessageCallback' in agent && typeof (agent as Record<string, unknown>).setMessageCallback === 'function') {
      ;(agent as { setMessageCallback: (cb: (msg: AgentMessage) => void) => void }).setMessageCallback(
        (message: AgentMessage) => this.routeMessage(message)
      )
    }

    // Listen for agent-specific messages
    this.messageBus.on(`agent:${agent.name}`, (message: AgentMessage) => {
      try {
        agent.onMessage(message)
      } catch (error) {
        console.error(`[Orchestrator] Error delivering message to ${agent.name}:`, error)
      }
    })

    console.log(`[Orchestrator] Agent registered: ${agent.name} (${agent.type})`)
  }

  unregisterAgent(name: string): void {
    const agent = this.agents.get(name)
    if (agent) {
      this.messageBus.removeAllListeners(`agent:${name}`)
      this.agents.delete(name)
      console.log(`[Orchestrator] Agent unregistered: ${name}`)
    }
  }

  // ============================================================
  // Default Agent Setup
  // ============================================================

  registerDefaultAgents(): void {
    // Register all 6 agents
    if (!this.agents.has('hermes')) {
      this.registerAgent(new HermesAgent())
    }
    if (!this.agents.has('picoclaw')) {
      this.registerAgent(new PicoClawAgent())
    }
    if (!this.agents.has('sentinel')) {
      this.registerAgent(new SentinelAgent())
    }
    if (!this.agents.has('navigator')) {
      this.registerAgent(new NavigatorAgent())
    }
    if (!this.agents.has('comms_guard')) {
      this.registerAgent(new CommsGuardAgent())
    }
    if (!this.agents.has('data_steward')) {
      this.registerAgent(new DataStewardAgent())
    }
  }

  // ============================================================
  // Orchestration Lifecycle
  // ============================================================

  async start(): Promise<void> {
    if (this.running) {
      console.warn('[Orchestrator] Already running')
      return
    }

    this.running = true
    this.startTime = new Date()

    // Initialize all registered agents
    for (const [name, agent] of this.agents) {
      try {
        await agent.initialize()
        console.log(`[Orchestrator] Agent initialized: ${name}`)
      } catch (error) {
        console.error(`[Orchestrator] Failed to initialize ${name}:`, error)
        if (this.config.autoRecovery) {
          console.log(`[Orchestrator] Will retry ${name} on next tick`)
        }
      }
    }

    // Start all agents
    for (const [name, agent] of this.agents) {
      try {
        await agent.start()
        console.log(`[Orchestrator] Agent started: ${name}`)
      } catch (error) {
        console.error(`[Orchestrator] Failed to start ${name}:`, error)
      }
    }

    // Start main orchestration loop
    this.mainLoop = setInterval(() => {
      this.tick()
    }, this.config.tickInterval)

    console.log('[Orchestrator] Started successfully')
  }

  async stop(): Promise<void> {
    if (!this.running) return

    this.running = false

    // Stop main loop
    if (this.mainLoop) {
      clearInterval(this.mainLoop)
      this.mainLoop = null
    }

    // Stop all agents
    for (const [name, agent] of this.agents) {
      try {
        await agent.stop()
        console.log(`[Orchestrator] Agent stopped: ${name}`)
      } catch (error) {
        console.error(`[Orchestrator] Error stopping ${name}:`, error)
      }
    }

    console.log('[Orchestrator] Stopped')
  }

  // ============================================================
  // Main Orchestration Cycle
  // ============================================================

  private async tick(): Promise<void> {
    this.lastTick = new Date()

    try {
      // 1. Process task queue
      await this.processTaskQueue()

      // 2. Auto-recovery for crashed agents
      if (this.config.autoRecovery) {
        await this.recoverCrashedAgents()
      }

      // 3. Process pending DB tasks
      await this.processDbTasks()
    } catch (error) {
      console.error('[Orchestrator] Tick error:', error)
    }
  }

  // --- Process the in-memory task queue ---

  private async processTaskQueue(): Promise<void> {
    // Sort by priority
    const priorityOrder: Record<string, number> = { critical: 0, high: 1, normal: 2, low: 3 }
    this.taskQueue.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3))

    // Process tasks up to max concurrent
    const runningTasks = this.taskQueue.filter(t => t.status === 'running')
    const availableSlots = this.config.maxConcurrentAgents - runningTasks.length

    if (availableSlots <= 0) return

    const pendingTasks = this.taskQueue.filter(t => t.status === 'pending').slice(0, availableSlots)

    for (const task of pendingTasks) {
      const agent = this.agents.get(task.agent)
      if (!agent) {
        task.status = 'failed'
        task.result = { error: `Agent "${task.agent}" not found` }
        this._tasksFailed++
        continue
      }

      // Execute task
      task.status = 'running'
      task.startedAt = new Date()

      try {
        const result = await agent.processTask(task)
        task.status = 'completed'
        task.result = result
        task.completedAt = new Date()
        this._tasksCompleted++
      } catch (error) {
        task.status = 'failed'
        task.result = { error: error instanceof Error ? error.message : 'Unknown error' }
        task.completedAt = new Date()
        this._tasksFailed++
      }
    }

    // Clean up completed/failed tasks (keep last 100)
    this.taskQueue = this.taskQueue.filter(t => t.status === 'pending' || t.status === 'running')
      .concat(this.taskQueue.filter(t => t.status !== 'pending' && t.status !== 'running').slice(-100))
  }

  // --- Recover crashed agents ---

  private async recoverCrashedAgents(): Promise<void> {
    for (const [name, agent] of this.agents) {
      if (agent.state === 'error') {
        console.log(`[Orchestrator] Recovering agent: ${name}`)
        try {
          await agent.stop()
          await agent.initialize()
          await agent.start()
          console.log(`[Orchestrator] Agent recovered: ${name}`)
        } catch (error) {
          console.error(`[Orchestrator] Failed to recover ${name}:`, error)
        }
      }
    }
  }

  // --- Process DB-backed tasks ---

  private async processDbTasks(): Promise<void> {
    const pendingDbTasks = await db.agentTaskRecord.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 5,
    })

    for (const dbTask of pendingDbTasks) {
      const agent = this.agents.get(dbTask.agent)
      if (!agent) {
        await db.agentTaskRecord.update({
          where: { id: dbTask.id },
          data: { status: 'failed', error: `Agent "${dbTask.agent}" not found`, completedAt: new Date() },
        })
        continue
      }

      // Mark as running
      await db.agentTaskRecord.update({
        where: { id: dbTask.id },
        data: { status: 'running', startedAt: new Date() },
      })

      try {
        const task: AgentTask = {
          id: dbTask.id,
          type: dbTask.type,
          agent: dbTask.agent,
          priority: dbTask.priority as AgentPriority,
          payload: JSON.parse(dbTask.payload),
          status: 'running',
          createdAt: dbTask.createdAt,
          startedAt: new Date(),
        }

        const result = await agent.processTask(task)

        await db.agentTaskRecord.update({
          where: { id: dbTask.id },
          data: {
            status: 'completed',
            result: JSON.stringify(result),
            completedAt: new Date(),
          },
        })

        this._tasksCompleted++
      } catch (error) {
        await db.agentTaskRecord.update({
          where: { id: dbTask.id },
          data: {
            status: 'failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            completedAt: new Date(),
          },
        })
        this._tasksFailed++
      }
    }
  }

  // ============================================================
  // Task Management
  // ============================================================

  submitTask(task: Omit<AgentTask, 'id' | 'status' | 'createdAt'>): string {
    const id = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const fullTask: AgentTask = {
      ...task,
      id,
      status: 'pending',
      createdAt: new Date(),
    }
    this.taskQueue.push(fullTask)
    return id
  }

  async submitTaskToDb(task: {
    type: string
    agent: string
    priority?: string
    payload: unknown
    missionId?: string
    projectId?: string
  }): Promise<string> {
    const record = await db.agentTaskRecord.create({
      data: {
        type: task.type,
        agent: task.agent,
        priority: task.priority || 'normal',
        status: 'pending',
        payload: JSON.stringify(task.payload),
        missionId: task.missionId || null,
        projectId: task.projectId || null,
      },
    })
    return record.id
  }

  cancelTask(taskId: string): void {
    const task = this.taskQueue.find(t => t.id === taskId)
    if (task && task.status === 'pending') {
      this.taskQueue = this.taskQueue.filter(t => t.id !== taskId)
    }
  }

  // ============================================================
  // Inter-Agent Communication
  // ============================================================

  sendMessage(from: string, to: string, message: Omit<AgentMessage, 'id' | 'from' | 'to' | 'timestamp'>): void {
    const fullMessage: AgentMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      from,
      to,
      timestamp: new Date(),
    }
    this.routeMessage(fullMessage)
  }

  broadcast(from: string, message: Omit<AgentMessage, 'id' | 'from' | 'to' | 'timestamp'>): void {
    for (const [agentName] of this.agents) {
      if (agentName !== from) {
        this.sendMessage(from, agentName, message)
      }
    }
  }

  private routeMessage(message: AgentMessage): void {
    this._messagesProcessed++

    // Log the communication
    const logEntry: AgentCommunicationLog = {
      id: message.id,
      from: message.from,
      to: message.to,
      type: message.type,
      priority: message.priority || 'normal',
      payloadSummary: JSON.stringify(message.payload).substring(0, 100),
      timestamp: message.timestamp,
    }
    this.communicationLog.push(logEntry)
    if (this.communicationLog.length > this.maxCommLogSize) {
      this.communicationLog = this.communicationLog.slice(-this.maxCommLogSize)
    }

    // Route to specific agent or broadcast
    if (message.to === '*') {
      // Broadcast to all agents except sender
      for (const [agentName] of this.agents) {
        if (agentName !== message.from) {
          this.messageBus.emit(`agent:${agentName}`, message)
        }
      }
    } else {
      // Direct message to specific agent
      this.messageBus.emit(`agent:${message.to}`, message)
    }

    // Also store in DB for audit trail (non-blocking)
    this.storeMessageLog(message).catch(() => {
      // Non-critical: ignore DB errors in message logging
    })
  }

  private async storeMessageLog(message: AgentMessage): Promise<void> {
    try {
      await db.agentMessage.create({
        data: {
          agent: message.from,
          role: message.type,
          content: `[${message.from}→${message.to}] ${message.type}: ${JSON.stringify(message.payload).substring(0, 500)}`,
          metadata: JSON.stringify({
            from: message.from,
            to: message.to,
            type: message.type,
            priority: message.priority,
          }),
        },
      })
    } catch {
      // Non-critical: ignore
    }
  }

  // ============================================================
  // Status & Information
  // ============================================================

  getStatus(): OrchestratorStatus {
    return {
      running: this.running,
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime.getTime()) / 1000) : 0,
      registeredAgents: Array.from(this.agents.keys()),
      activeAgents: Array.from(this.agents.values())
        .filter(a => a.state !== 'idle' && a.state !== 'error')
        .map(a => a.name),
      taskQueueSize: this.taskQueue.filter(t => t.status === 'pending').length,
      tasksCompleted: this._tasksCompleted,
      tasksFailed: this._tasksFailed,
      messagesProcessed: this._messagesProcessed,
      lastTick: this.lastTick,
      config: this.config,
    }
  }

  getAgentStatus(agentName: string): AgentStatus | null {
    const agent = this.agents.get(agentName)
    return agent ? agent.getStatus() : null
  }

  getAllAgentStatuses(): Record<string, AgentStatus> {
    const statuses: Record<string, AgentStatus> = {}
    for (const [name, agent] of this.agents) {
      statuses[name] = agent.getStatus()
    }
    return statuses
  }

  getTaskQueue(): AgentTask[] {
    return [...this.taskQueue]
  }

  getCommunicationLog(limit: number = 50): AgentCommunicationLog[] {
    return this.communicationLog.slice(-limit)
  }

  // ============================================================
  // Convenience: Get specific agent instances
  // ============================================================

  getSentinelAgent(): SentinelAgent | null {
    return (this.agents.get('sentinel') as SentinelAgent) || null
  }

  getNavigatorAgent(): NavigatorAgent | null {
    return (this.agents.get('navigator') as NavigatorAgent) || null
  }

  getCommsGuardAgent(): CommsGuardAgent | null {
    return (this.agents.get('comms_guard') as CommsGuardAgent) || null
  }

  getDataStewardAgent(): DataStewardAgent | null {
    return (this.agents.get('data_steward') as DataStewardAgent) || null
  }

  getHermesAgent(): HermesAgent | null {
    return (this.agents.get('hermes') as HermesAgent) || null
  }

  getPicoClawAgent(): PicoClawAgent | null {
    return (this.agents.get('picoclaw') as PicoClawAgent) || null
  }

  isRunning(): boolean {
    return this.running
  }
}
