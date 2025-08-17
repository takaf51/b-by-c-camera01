// ルート定義
import Home from './routes/Home.svelte';
import Login from './routes/Login.svelte';
import LoginDigit from './routes/LoginDigit.svelte';
import Register from './routes/Register.svelte';
import EventList from './routes/EventList.svelte';
import EventDetail from './routes/EventDetail.svelte';
import NotFound from './routes/NotFound.svelte';

export const routes = {
  // ホーム
  '/': Home,

  // 認証
  '/login': Login,
  '/login/digit': LoginDigit,
  '/register': Register,

  // イベント
  '/event/list': EventList,
  '/event/detail/:id': EventDetail,

  // 404
  '*': NotFound,
};
