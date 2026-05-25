// ============================================================
// NANGGROE OS AI - AI Memory & Sync Service
// Offline-first memory for AI agents, sync when online
// ============================================================

import { db } from './db'
import type { AiMemoryCategory, AiMemoryEntry } from './types'

// ============================================================
// AiMemoryService
// ============================================================

export class AiMemoryService {
  private static instance: AiMemoryService
  private localCache: Map<string, AiMemoryEntry> = new Map()

  private constructor() {}

  static getInstance(): AiMemoryService {
    if (!AiMemoryService.instance) {
      AiMemoryService.instance = new AiMemoryService()
    }
    return AiMemoryService.instance
  }

  /**
   * Store a memory entry
   */
  async remember(
    category: AiMemoryCategory,
    key: string,
    value: unknown,
    context?: string,
    confidence: number = 1.0,
    projectId?: string
  ): Promise<AiMemoryEntry> {
    const entry = await db.aiMemory.create({
      data: {
        category,
        key,
        value: JSON.stringify(value),
        context: context || null,
        confidence,
        isSynced: false,
        projectId: projectId || null,
      },
    })

    const memoryEntry = this.entryToSummary(entry)
    this.localCache.set(`${category}:${key}`, memoryEntry)
    return memoryEntry
  }

  /**
   * Recall a memory entry
   */
  async recall(category: AiMemoryCategory, key: string): Promise<AiMemoryEntry | null> {
    // Check local cache first
    const cached = this.localCache.get(`${category}:${key}`)
    if (cached) {
      // Update access count
      await db.aiMemory.update({
        where: { id: cached.id },
        data: { accessCount: { increment: 1 }, accessedAt: new Date() },
      })
      return cached
    }

    // Check database
    const entry = await db.aiMemory.findFirst({
      where: { category, key },
      orderBy: { createdAt: 'desc' },
    })

    if (!entry) return null

    const memoryEntry = this.entryToSummary(entry)
    this.localCache.set(`${category}:${key}`, memoryEntry)

    // Update access count
    await db.aiMemory.update({
      where: { id: entry.id },
      data: { accessCount: { increment: 1 }, accessedAt: new Date() },
    })

    return memoryEntry
  }

  /**
   * Search memories by category or partial key
   */
  async search(category?: AiMemoryCategory, query?: string, limit: number = 20): Promise<AiMemoryEntry[]> {
    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (query) where.key = { contains: query }

    const entries = await db.aiMemory.findMany({
      where,
      orderBy: { accessedAt: 'desc' },
      take: limit,
    })

    return entries.map(e => this.entryToSummary(e))
  }

  /**
   * Sync unsynced memories to cloud
   */
  async syncToCloud(): Promise<{ synced: number; failed: number }> {
    const unsynced = await db.aiMemory.findMany({
      where: { isSynced: false },
      take: 100,
    })

    let synced = 0
    let failed = 0

    for (const entry of unsynced) {
      try {
        // In production: POST to cloud sync endpoint
        // For now, mark as synced
        await db.aiMemory.update({
          where: { id: entry.id },
          data: { isSynced: true },
        })
        synced++
      } catch {
        failed++
      }
    }

    return { synced, failed }
  }

  /**
   * Get memory statistics
   */
  async getStats(): Promise<{
    totalEntries: number
    byCategory: Record<string, number>
    unsyncedCount: number
    topAccessed: AiMemoryEntry[]
  }> {
    const totalEntries = await db.aiMemory.count()
    const unsyncedCount = await db.aiMemory.count({ where: { isSynced: false } })

    const categories = await db.aiMemory.groupBy({
      by: ['category'],
      _count: { category: true },
    })

    const byCategory: Record<string, number> = {}
    for (const c of categories) {
      byCategory[c.category] = c._count.category
    }

    const topAccessed = await db.aiMemory.findMany({
      orderBy: { accessCount: 'desc' },
      take: 5,
    })

    return {
      totalEntries,
      byCategory,
      unsyncedCount,
      topAccessed: topAccessed.map(e => this.entryToSummary(e)),
    }
  }

  /**
   * Delete a memory entry
   */
  async forget(memoryId: string): Promise<boolean> {
    try {
      const entry = await db.aiMemory.findUnique({ where: { id: memoryId } })
      if (entry) {
        this.localCache.delete(`${entry.category}:${entry.key}`)
      }
      await db.aiMemory.delete({ where: { id: memoryId } })
      return true
    } catch {
      return false
    }
  }

  // --- Helper ---
  private entryToSummary(entry: {
    id: string
    category: string
    key: string
    value: string
    context: string | null
    confidence: number
    accessCount: number
    isSynced: boolean
    createdAt: Date
    accessedAt: Date
  }): AiMemoryEntry {
    return {
      id: entry.id,
      category: entry.category as AiMemoryCategory,
      key: entry.key,
      value: JSON.parse(entry.value),
      context: entry.context,
      confidence: entry.confidence,
      accessCount: entry.accessCount,
      isSynced: entry.isSynced,
      createdAt: entry.createdAt.toISOString(),
      accessedAt: entry.accessedAt.toISOString(),
    }
  }
}
