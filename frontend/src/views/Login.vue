<template>
  <div class="max-w-md mx-auto">
    <div class="card">
      <div class="card-header">
        <h2 class="text-2xl font-bold text-center text-gray-900">Sign In</h2>
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
                :class="{ 'border-red-300': $v.username.$error }"
                placeholder="Enter your username"
              />
              <div v-if="$v.username.$error" class="mt-1 text-sm text-red-600">
                <div v-if="!$v.username.required">Username is required</div>
              </div>
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
                :class="{ 'border-red-300': $v.password.$error }"
                placeholder="Enter your password"
              />
              <div v-if="$v.password.$error" class="mt-1 text-sm text-red-600">
                <div v-if="!$v.password.required">Password is required</div>
              </div>
            </div>

            <div v-if="error" class="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {{ error }}
            </div>

            <button
              type="submit"
              :disabled="loading || $v.$invalid"
              class="btn btn-primary w-full"
            >
              <span v-if="loading">Signing in...</span>
              <span v-else>Sign In</span>
            </button>
          </div>
        </form>

        <div class="mt-6 text-center">
          <p class="text-sm text-gray-600">
            Don't have an account?
            <router-link to="/register" class="text-primary-600 hover:text-primary-500 font-medium">
              Sign up
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
import { useVuelidate } from '@vuelidate/core'
import { required } from '@vuelidate/validators'
import { useAuthStore } from '@/stores/auth'
import type { LoginCredentials } from '@/types'

const router = useRouter()
const authStore = useAuthStore()

const loading = ref(false)
const error = ref('')

const form = reactive<LoginCredentials>({
  username: '',
  password: ''
})

const rules = {
  username: { required },
  password: { required }
}

const $v = useVuelidate(rules, form)

const handleSubmit = async () => {
  if ($v.value.$invalid) {
    $v.value.$touch()
    return
  }

  loading.value = true
  error.value = ''

  try {
    await authStore.login(form)
    router.push('/rooms')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed'
  } finally {
    loading.value = false
  }
}
</script>
