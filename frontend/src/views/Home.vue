<template>
  <div class="max-w-4xl mx-auto">
    <div class="text-center py-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-8">
        Welcome to WebRTC Platform
      </h1>
      <p class="text-xl text-gray-600 mb-8">
        Connect with others through high-quality video calls
      </p>

      <div class="space-y-4 sm:space-y-0 sm:space-x-4 sm:flex sm:justify-center">
        <router-link
          v-if="!authStore.isAuthenticated"
          to="/register"
          class="btn btn-primary"
        >
          Get Started
        </router-link>
        <router-link
          v-if="!authStore.isAuthenticated"
          to="/login"
          class="btn btn-secondary"
        >
          Sign In
        </router-link>
        <router-link
          v-if="authStore.isAuthenticated"
          to="/rooms"
          class="btn btn-primary"
        >
          Browse Rooms
        </router-link>
      </div>
    </div>

    <!-- Features Section -->
    <div class="py-12">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div class="text-center">
          <div class="bg-primary-100 rounded-lg p-6 mb-4">
            <svg class="h-12 w-12 text-primary-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">HD Video Calls</h3>
          <p class="text-gray-600">Crystal clear video quality with low latency communication</p>
        </div>

        <div class="text-center">
          <div class="bg-primary-100 rounded-lg p-6 mb-4">
            <svg class="h-12 w-12 text-primary-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Group Rooms</h3>
          <p class="text-gray-600">Create or join rooms for group conversations and meetings</p>
        </div>

        <div class="text-center">
          <div class="bg-primary-100 rounded-lg p-6 mb-4">
            <svg class="h-12 w-12 text-primary-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-gray-900 mb-2">Secure & Private</h3>
          <p class="text-gray-600">End-to-end encryption and secure authentication</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>
