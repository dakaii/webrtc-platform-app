<template>
  <div class="max-w-md mx-auto">
    <div class="card">
      <div class="card-header">
        <h2 class="text-2xl font-bold text-center text-gray-900">Create Account</h2>
      </div>

      <div class="card-body">
        <form @submit.prevent="handleSubmit">
          <div class="space-y-4">
            <div>
              <label for="username" class="block text-sm font-medium text-gray-700">
                Username
              </label>
              <input
                id="username"
                v-model="form.username"
                type="text"
                class="input"
                placeholder="Choose a username"
              />
            </div>

            <div>
              <label for="email" class="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                class="input"
                placeholder="Enter your email"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                v-model="form.password"
                type="password"
                class="input"
                placeholder="Choose a password"
              />
            </div>

            <div v-if="error" class="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {{ error }}
            </div>

            <button
              type="submit"
              :disabled="loading"
              class="btn btn-primary w-full"
            >
              <span v-if="loading">Creating account...</span>
              <span v-else>Create Account</span>
            </button>
          </div>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Already have an account?
            <router-link to="/login" class="text-primary-600 hover:text-primary-500 font-medium">
              Sign in
            </router-link>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { RegisterCredentials } from '@/types'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref('')

const form = reactive<RegisterCredentials>({
  username: '',
  email: '',
  password: ''
})

const handleSubmit = async () => {
  loading.value = true
  error.value = ''

  try {
    await authStore.register(form)
    router.push('/rooms')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>
