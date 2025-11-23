export interface User {
    id: number
    username: string
    email: string
    firstName: string
    lastName: string
    role: string
    permissions: {
      can_access_live_data: boolean
      can_modify_strategy: boolean
      can_acknowledge_alerts: boolean
    }
  }