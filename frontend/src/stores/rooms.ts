import { defineStore } from "pinia";
import { ref, computed, readonly } from "vue";
import type { Room, CreateRoomData, JoinRoomData } from "@/types";
import { roomService } from "@/services/rooms";

export const useRoomsStore = defineStore("rooms", () => {
  const rooms = ref<Room[]>([]);
  const currentRoom = ref<Room | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const activeRooms = computed(() =>
    rooms.value.filter((room) => room.isActive)
  );

  const fetchRooms = async (): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      rooms.value = await roomService.getRooms();
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to fetch rooms";
      console.error("Failed to fetch rooms:", err);
    } finally {
      loading.value = false;
    }
  };

  const createRoom = async (roomData: CreateRoomData): Promise<Room> => {
    loading.value = true;
    error.value = null;

    try {
      const newRoom = await roomService.createRoom(roomData);
      rooms.value.push(newRoom);
      return newRoom;
    } catch (err) {
      error.value =
        err instanceof Error ? err.message : "Failed to create room";
      console.error("Failed to create room:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const joinRoom = async (
    roomId: number,
    joinData?: JoinRoomData
  ): Promise<Room> => {
    loading.value = true;
    error.value = null;

    try {
      const room = await roomService.joinRoom(roomId, joinData);
      currentRoom.value = room;

      // Update the room in the list if it exists
      const roomIndex = rooms.value.findIndex((r) => r.id === roomId);
      if (roomIndex !== -1) {
        rooms.value[roomIndex] = room;
      }

      return room;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to join room";
      console.error("Failed to join room:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const leaveRoom = async (roomId: number): Promise<void> => {
    loading.value = true;
    error.value = null;

    try {
      await roomService.leaveRoom(roomId);
      currentRoom.value = null;

      // Refresh the room data
      const room = await roomService.getRoom(roomId);
      const roomIndex = rooms.value.findIndex((r) => r.id === roomId);
      if (roomIndex !== -1) {
        rooms.value[roomIndex] = room;
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to leave room";
      console.error("Failed to leave room:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const getRoom = async (roomId: number): Promise<Room> => {
    loading.value = true;
    error.value = null;

    try {
      const room = await roomService.getRoom(roomId);

      // Update current room if it's the same
      if (currentRoom.value?.id === roomId) {
        currentRoom.value = room;
      }

      // Update the room in the list
      const roomIndex = rooms.value.findIndex((r) => r.id === roomId);
      if (roomIndex !== -1) {
        rooms.value[roomIndex] = room;
      } else {
        rooms.value.push(room);
      }

      return room;
    } catch (err) {
      error.value = err instanceof Error ? err.message : "Failed to get room";
      console.error("Failed to get room:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  const clearError = (): void => {
    error.value = null;
  };

  const setCurrentRoom = (room: Room | null): void => {
    currentRoom.value = room;
  };

  return {
    rooms: readonly(rooms),
    currentRoom: readonly(currentRoom),
    loading: readonly(loading),
    error: readonly(error),
    activeRooms,
    fetchRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    getRoom,
    clearError,
    setCurrentRoom,
  };
});
