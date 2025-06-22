import type { Room, CreateRoomData, JoinRoomData } from '@/types'
import { apiService } from './api'

class RoomService {
  async getRooms(): Promise<Room[]> {
    return apiService.get<Room[]>('/rooms')
  }

  async getRoom(id: number): Promise<Room> {
    return apiService.get<Room>(`/rooms/${id}`)
  }

  async createRoom(roomData: CreateRoomData): Promise<Room> {
    return apiService.post<Room>('/rooms', roomData)
  }

  async updateRoom(id: number, roomData: Partial<CreateRoomData>): Promise<Room> {
    return apiService.patch<Room>(`/rooms/${id}`, roomData)
  }

  async deleteRoom(id: number): Promise<void> {
    return apiService.delete<void>(`/rooms/${id}`)
  }

  async joinRoom(id: number, joinData?: JoinRoomData): Promise<Room> {
    return apiService.post<Room>(`/rooms/${id}/join`, joinData)
  }

  async leaveRoom(id: number): Promise<void> {
    return apiService.post<void>(`/rooms/${id}/leave`)
  }
}

export const roomService = new RoomService()
