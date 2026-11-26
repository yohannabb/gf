<script setup>
import Icon from './Icon.vue'
import { t } from '@/i18n'
</script>

<template>
  <nav class="nav" aria-label="main">
    <router-link to="/" active-class="" exact-active-class="active">
      <Icon name="home" :size="24" /> {{ t('home') }}
    </router-link>
    <router-link to="/tickets" active-class="active">
      <Icon name="ticket" :size="24" /> {{ t('tickets') }}
    </router-link>
    <router-link to="/profile" active-class="active">
      <Icon name="user" :size="24" /> {{ t('profile') }}
    </router-link>
  </nav>
</template>
