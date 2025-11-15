// 增强的错误处理和恢复机制
// 适用于 telegram-web-auto-reply 项目

class ErrorHandler {
  constructor() {
    this.errorCount = 0
    this.lastError = null
    this.isRecovering = false
    this.maxRetries = 3
    this.retryDelay = 1000
  }

  // 全局错误捕获
  setupGlobalHandlers() {
    // 未捕获的异常
    process.on('uncaughtException', (error) => {
      console.error('未捕获的异常:', error)
      this.handleError(error, 'UNCAUGHT_EXCEPTION')
    })

    // 未处理的Promise拒绝
    process.on('unhandledRejection', (reason, promise) => {
      console.error('未处理的Promise拒绝:', reason)
      this.handleError(reason, 'UNHANDLED_REJECTION')
    })

    // Electron应用错误
    if (typeof require !== 'undefined') {
      const { app } = require('electron')
      app.on('render-process-gone', (event, webContents, details) => {
        console.error('渲染进程崩溃:', details)
        this.handleRendererCrash(details)
      })
    }
  }

  // 错误处理主函数
  async handleError(error, type = 'UNKNOWN') {
    this.errorCount++
    this.lastError = {
      error: error.message || error,
      type,
      timestamp: new Date().toISOString(),
      count: this.errorCount
    }

    console.error(`[${type}] 错误处理:`, this.lastError)

    // 避免重复恢复
    if (this.isRecovering) {
      console.log('正在恢复中，跳过重复处理')
      return
    }

    // 根据错误类型采取不同策略
    switch (type) {
      case 'UNCAUGHT_EXCEPTION':
        await this.handleCriticalError(error)
        break
      case 'UNHANDLED_REJECTION':
        await this.handlePromiseError(error)
        break
      case 'SSR_IMPORT_ERROR':
        await this.handleSSRError(error)
        break
      case 'MEMORY_ERROR':
        await this.handleMemoryError(error)
        break
      default:
        await this.handleGenericError(error)
    }
  }

  // 处理关键错误
  async handleCriticalError(error) {
    console.error('关键错误，尝试恢复...')
    
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        await this.attemptRecovery()
        console.log('恢复成功')
        return
      } catch (recoveryError) {
        console.error(`恢复尝试 ${i + 1} 失败:`, recoveryError)
        await this.delay(this.retryDelay * (i + 1))
      }
    }

    console.error('所有恢复尝试失败，退出应用')
    process.exit(1)
  }

  // 处理SSR导入错误
  async handleSSRError(error) {
    console.error('SSR导入错误，修复模块导入...')
    
    try {
      // 重新加载模块
      delete require.cache[require.resolve('./main/index')]
      const mainModule = require('./main/index')
      console.log('SSR模块重新加载成功')
    } catch (reloadError) {
      console.error('模块重新加载失败:', reloadError)
      throw reloadError
    }
  }

  // 处理内存错误
  async handleMemoryError(error) {
    console.error('内存错误，执行清理...')
    
    try {
      // 强制垃圾回收
      if (global.gc) {
        global.gc()
      }
      
      // 清理缓存
      this.clearCaches()
      
      // 重置计数器
      this.errorCount = 0
      
      console.log('内存清理完成')
    } catch (cleanupError) {
      console.error('内存清理失败:', cleanupError)
    }
  }

  // 处理渲染进程崩溃
  async handleRendererCrash(details) {
    console.error('渲染进程崩溃，尝试重启...')
    
    try {
      const { app, BrowserWindow } = require('electron')
      
      // 关闭所有窗口
      BrowserWindow.getAllWindows().forEach(window => {
        if (!window.isDestroyed()) {
          window.close()
        }
      })
      
      // 重新创建窗口
      await this.delay(1000)
      const { createWindow } = require('./main/index')
      createWindow()
      
      console.log('渲染进程重启成功')
    } catch (restartError) {
      console.error('渲染进程重启失败:', restartError)
    }
  }

  // 通用错误处理
  async handleGenericError(error) {
    console.warn('通用错误，记录并继续...')
    
    // 记录错误日志
    this.logError(error)
    
    // 轻量级恢复
    this.errorCount = Math.max(0, this.errorCount - 1)
  }

  // 尝试恢复
  async attemptRecovery() {
    this.isRecovering = true
    
    try {
      // 1. 清理内存
      if (global.gc) {
        global.gc()
      }
      
      // 2. 重置状态
      this.resetState()
      
      // 3. 重新初始化关键模块
      await this.reinitializeModules()
      
    } finally {
      this.isRecovering = false
    }
  }

  // 重置状态
  resetState() {
    this.errorCount = 0
    this.lastError = null
  }

  // 重新初始化模块
  async reinitializeModules() {
    // 这里添加需要重新初始化的模块
    console.log('重新初始化模块...')
  }

  // 清理缓存
  clearCaches() {
    // 清理require缓存
    Object.keys(require.cache).forEach(key => {
      if (key.includes('node_modules') === false) {
        delete require.cache[key]
      }
    })
  }

  // 记录错误
  logError(error) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      error: error.message || error,
      stack: error.stack,
      count: this.errorCount
    }
    
    // 这里可以写入日志文件或发送到监控系统
    console.log('错误日志:', JSON.stringify(logEntry, null, 2))
  }

  // 延迟函数
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// 内存优化工具
class MemoryOptimizer {
  constructor() {
    this.threshold = 512 * 1024 * 1024 // 512MB
    this.gcInterval = 30000 // 30秒
    this.maxQueueSize = 1000
    
    this.startMonitoring()
  }

  startMonitoring() {
    setInterval(() => {
      this.checkMemoryUsage()
    }, this.gcInterval)
  }

  checkMemoryUsage() {
    const usage = process.memoryUsage()
    
    if (usage.heapUsed > this.threshold) {
      console.warn('内存使用超过阈值，执行优化...')
      this.optimizeMemory()
    }
  }

  optimizeMemory() {
    try {
      // 强制垃圾回收
      if (global.gc) {
        global.gc()
      }
      
      // 清理对象池
      this.clearObjectPools()
      
      // 重置队列
      this.resetQueues()
      
      const newUsage = process.memoryUsage()
      console.log('内存优化完成:', {
        之前: Math.round(this.lastUsage?.heapUsed / 1024 / 1024) + 'MB',
        之后: Math.round(newUsage.heapUsed / 1024 / 1024) + 'MB'
      })
      
      this.lastUsage = newUsage
    } catch (error) {
      console.error('内存优化失败:', error)
    }
  }

  clearObjectPools() {
    // 清理对象池实现
  }

  resetQueues() {
    // 重置队列实现
  }
}

// 使用示例
const errorHandler = new ErrorHandler()
const memoryOptimizer = new MemoryOptimizer()

// 设置全局错误处理
errorHandler.setupGlobalHandlers()

// 导出模块
module.exports = {
  ErrorHandler,
  MemoryOptimizer,
  errorHandler,
  memoryOptimizer
}
