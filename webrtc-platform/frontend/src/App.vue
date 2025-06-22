<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <!-- Navigation -->
    <nav class="bg-white shadow-sm border-b">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <router-link to="/" class="flex-shrink-0 flex items-center">
              <h1 class="text-xl font-bold text-primary-600">WebRTC Platform</h1>
            </router-link>
          </div>

          <div class="flex items-center space-x-4">
            <template v-if="authStore.isAuthenticated">
              <span class="text-sm text-gray-700">
                Welcome, {{ authStore.user?.username }}
              </span>
              <button
                @click="handleLogout"
                class="btn btn-secondary text-sm"
              >
                Logout
              </button>
            </template>
            <template v-else>
              <router-link to="/login" class="btn btn-primary text-sm">
                Login
              </router-link>
            </template>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div class="px-4 py-6 sm:px-0">
        <router-view />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

const handleLogout = async () => {
  await authStore.logout()
  router.push('/login')
}
</script>
