import { createRouter, createWebHistory } from 'vue-router'
import { useApp } from '@/stores/app'
import HomeView from '@/views/HomeView.vue'
import BuyView from '@/views/BuyView.vue'
import TicketsView from '@/views/TicketsView.vue'
import ProfileView from '@/views/ProfileView.vue'
import NotificationsView from '@/views/NotificationsView.vue'
import AdminView from '@/views/AdminView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomeView },
    { path: '/lottery/:id', component: BuyView },
    { path: '/tickets', component: TicketsView },
    { path: '/profile', component: ProfileView },
    { path: '/notifications', component: NotificationsView },
    { path: '/admin', component: AdminView, meta: { admin: true } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const app = useApp()
  await app.init()
  if (to.meta.admin && !app.me?.isAdmin) return '/'
})

export default router
