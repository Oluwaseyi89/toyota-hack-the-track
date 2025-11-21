class WebSocketService {
    private ws: WebSocket | null = null
    private reconnectAttempts = 0
    private maxReconnectAttempts = 5
  
    connect(url: string) {
      this.ws = new WebSocket(url)
  
      this.ws.onopen = () => {
        console.log('WebSocket connected')
        this.reconnectAttempts = 0
      }
  
      this.ws.onclose = () => {
        console.log('WebSocket disconnected')
        this.attemptReconnect(url)
      }
  
      return this.ws
    }
  
    private attemptReconnect(url: string) {
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        setTimeout(() => this.connect(url), 1000 * this.reconnectAttempts)
      }
    }
  
    send(message: any) {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message))
      }
    }
  
    disconnect() {
      this.ws?.close()
    }
  }
  
  export const websocketService = new WebSocketService()