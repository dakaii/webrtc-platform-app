<template>
  <div class="max-w-6xl mx-auto">
    <div class="sm:flex sm:items-center mb-8">
      <div class="sm:flex-auto">
        <h1 class="text-2xl font-semibold text-gray-900">Video Rooms</h1>
        <p class="mt-2 text-sm text-gray-700">
          Join existing rooms or create your own
        </p>
      </div>
      <div class="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
        <button
          @click="showCreateModal = true"
          class="btn btn-primary"
        >
          Create Room
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      <p class="mt-2 text-gray-600">Loading rooms...</p>
    </div>

    <!-- Rooms Grid -->
    <div v-else class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="room in rooms"
        :key="room.id"
        class="card hover:shadow-lg transition-shadow cursor-pointer"
        @click="joinRoom(room)"
      >
        <div class="card-body">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-gray-900">{{ room.name }}</h3>
            <span v-if="room.isPrivate" class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              Private
            </span>
          </div>

          <p v-if="room.description" class="text-gray-600 mb-4">{{ room.description }}</p>

          <div class="flex items-center justify-between text-sm text-gray-500">
            <span>{{ room.participantCount || 0 }}/{{ room.maxParticipants }} participants</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="!loading && rooms.length === 0" class="text-center py-12">
      <h3 class="mt-2 text-sm font-medium text-gray-900">No rooms available</h3>
      <p class="mt-1 text-sm text-gray-500">Get started by creating a new room.</p>
      <div class="mt-6">
        <button @click="showCreateModal = true" class="btn btn-primary">
          Create Room
        </button>
      </div>
    </div>

    <!-- Create Room Modal -->
    <div v-if="showCreateModal" class="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center">
      <div class="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 class="text-lg font-medium text-gray-900 mb-4">Create New Room</h3>
        <form @submit.prevent="createRoom">
          <div class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700">Room Name</label>
              <input v-model="newRoom.name" type="text" class="input" required />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700">Description</label>
              <textarea v-model="newRoom.description" class="input" rows="3"></textarea>
            </div>
            <div class="flex items-center">
              <input v-model="newRoom.isPrivate" type="checkbox" class="mr-2" />
              <label class="text-sm text-gray-700">Private Room</label>
            </div>
          </div>
          <div class="mt-6 flex space-x-3">
            <button type="submit" class="btn btn-primary">Create</button>
            <button type="button" @click="showCreateModal = false" class="btn btn-secondary">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useRoomsStore } from '@/stores/rooms'
import type { Room, CreateRoomData } from '@/types'

const router = useRouter()
const roomsStore = useRoomsStore()

const showCreateModal = ref(false)

const newRoom = reactive<CreateRoomData>({
  name: '',
  description: '',
  isPrivate: false,
  maxParticipants: 10
})

// Use store's reactive data directly (don't destructure to maintain reactivity)
const rooms = computed(() => roomsStore.rooms)
const loading = computed(() => roomsStore.loading)
const error = computed(() => roomsStore.error)

onMounted(async () => {
  await roomsStore.fetchRooms()
})

const joinRoom = async (room: Room) => {
  router.push(`/room/${room.id}`)
}

const createRoom = async () => {
  try {
    const room = await roomsStore.createRoom(newRoom)
    showCreateModal.value = false
    router.push(`/room/${room.id}`)
  } catch (error) {
    console.error('Failed to create room:', error)
  }
}
</script>
