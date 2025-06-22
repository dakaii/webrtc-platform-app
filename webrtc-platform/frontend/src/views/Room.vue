<template>
  <div class="h-screen flex flex-col bg-gray-900">
    <!-- Header -->
    <div class="bg-gray-800 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <h1 class="text-white font-semibold">{{ currentRoom?.name || 'Loading...' }}</h1>
        <div class="text-gray-300 text-sm">
          {{ participantCount }} participant{{ participantCount !== 1 ? 's' : '' }}
        </div>
      </div>

      <div class="flex items-center space-x-2">
        <button
          @click="toggleMute"
          :class="[
            'p-2 rounded-full transition-colors',
            isMuted ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
          ]"
        >
          <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path v-if="!isMuted" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>

        <button
          @click="toggleVideo"
          :class="[
            'p-2 rounded-full transition-colors',
            isVideoOff ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-600 hover:bg-gray-700'
          ]"
        >
          <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path v-if="!isVideoOff" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            <path v-else stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18 16.5v6c0 .75-.75 1.5-1.5 1.5h-15c-.75 0-1.5-.75-1.5-1.5v-15C0 6.75.75 6 1.5 6h6l12.864 12.364z" />
          </svg>
        </button>

        <button
          @click="leaveRoom"
          class="p-2 bg-red-600 hover:bg-red-700 rounded-full transition-colors"
        >
          <svg class="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Video Grid -->
    <div class="flex-1 p-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
        <!-- Local Video -->
        <div class="relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref="localVideo"
            autoplay
            muted
            class="w-full h-full object-cover"
          ></video>
          <div class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
            You
          </div>
        </div>

        <!-- Remote Videos -->
        <div
          v-for="participant in remoteParticipants"
          :key="participant.id"
          class="relative bg-gray-800 rounded-lg overflow-hidden"
        >
          <video
            :ref="`remoteVideo-${participant.id}`"
            autoplay
            class="w-full h-full object-cover"
          ></video>
          <div class="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
            {{ participant.username }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoomsStore } from '@/stores/rooms'
import { webSocketService } from '@/services/websocket'
import { useWebRTC } from '@/composables/useWebRTC'

const route = useRoute()
const router = useRouter()
const roomsStore = useRoomsStore()

const roomId = Number(route.params.id)
const localVideo = ref<HTMLVideoElement>()
const currentRoom = computed(() => roomsStore.currentRoom)

const {
  remoteParticipants,
  isMuted,
  isVideoOff,
  startLocalStream,
  stopLocalStream,
  toggleMute,
  toggleVideo,
  handleSignalingData
} = useWebRTC(localVideo)

const participantCount = computed(() => {
  return (currentRoom.value?.participants?.length || 0) + remoteParticipants.value.length
})

onMounted(async () => {
  try {
    // Get room details
    await roomsStore.getRoom(roomId)

    // Join the room
    await roomsStore.joinRoom(roomId)

    // Start local video stream
    await startLocalStream()

    // Setup WebSocket for signaling
    setupSignaling()
  } catch (error) {
    console.error('Failed to join room:', error)
    router.push('/rooms')
  }
})

onUnmounted(async () => {
  stopLocalStream()
  if (currentRoom.value) {
    await roomsStore.leaveRoom(currentRoom.value.id)
  }
})

const setupSignaling = () => {
  webSocketService.on('user-joined', handleUserJoined)
  webSocketService.on('user-left', handleUserLeft)
  webSocketService.on('offer', handleSignalingData)
  webSocketService.on('answer', handleSignalingData)
  webSocketService.on('ice-candidate', handleSignalingData)
}

const handleUserJoined = (data: any) => {
  console.log('User joined:', data)
  // Handle new user joining
}

const handleUserLeft = (data: any) => {
  console.log('User left:', data)
  // Handle user leaving
}

const leaveRoom = async () => {
  if (currentRoom.value) {
    await roomsStore.leaveRoom(currentRoom.value.id)
  }
  stopLocalStream()
  router.push('/rooms')
}
</script>
