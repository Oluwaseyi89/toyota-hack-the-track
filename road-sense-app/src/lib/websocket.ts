// class WebSocketService {
//     private ws: WebSocket | null = null
//     private reconnectAttempts = 0
//     private maxReconnectAttempts = 5
  
//     connect(url: string) {
//       this.ws = new WebSocket(url)
  
//       this.ws.onopen = () => {
//         console.log('WebSocket connected')
//         this.reconnectAttempts = 0
//       }
  
//       this.ws.onclose = () => {
//         console.log('WebSocket disconnected')
//         this.attemptReconnect(url)
//       }
  
//       return this.ws
//     }
  
//     private attemptReconnect(url: string) {
//       if (this.reconnectAttempts < this.maxReconnectAttempts) {
//         this.reconnectAttempts++
//         setTimeout(() => this.connect(url), 1000 * this.reconnectAttempts)
//       }
//     }
  
//     send(message: any) {
//       if (this.ws && this.ws.readyState === WebSocket.OPEN) {
//         this.ws.send(JSON.stringify(message))
//       }
//     }
  
//     disconnect() {
//       this.ws?.close()
//     }
//   }
  
//   export const websocketService = new WebSocketService()






interface WebSocketMessage {
  type: 'telemetry' | 'weather' | 'alert' | 'tire' | 'strategy'
  data: any
}

class WebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private messageHandlers: ((message: WebSocketMessage) => void)[] = []
  private connectionHandlers: ((connected: boolean) => void)[] = []

  connect(url: string = 'ws://localhost:8000/ws/telemetry/') {
    this.ws = new WebSocket(url)

    this.ws.onopen = () => {
      console.log('🏁 WebSocket connected to racing telemetry')
      this.reconnectAttempts = 0
      this.connectionHandlers.forEach(handler => handler(true))
      
      // Subscribe to telemetry updates
      this.send({ type: 'subscribe_telemetry' })
    }

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data)
        this.messageHandlers.forEach(handler => handler(message))
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error)
      }
    }

    this.ws.onclose = () => {
      console.log('🔌 WebSocket disconnected')
      this.connectionHandlers.forEach(handler => handler(false))
      this.attemptReconnect(url)
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return this.ws
  }

  onMessage(handler: (message: WebSocketMessage) => void) {
    this.messageHandlers.push(handler)
  }

  onConnectionChange(handler: (connected: boolean) => void) {
    this.connectionHandlers.push(handler)
  }

  private attemptReconnect(url: string) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = 1000 * this.reconnectAttempts
      console.log(`Reconnecting in ${delay}ms...`)
      setTimeout(() => this.connect(url), delay)
    } else {
      console.error('Max reconnection attempts reached')
    }
  }

  send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    } else {
      console.warn('WebSocket not connected, cannot send message')
    }
  }

  requestCurrentData() {
    this.send({ type: 'request_current_data' })
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts // Prevent reconnection
    this.ws?.close()
  }
}

export const websocketService = new WebSocketService()