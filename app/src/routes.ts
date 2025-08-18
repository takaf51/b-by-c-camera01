// ルート定義
import Login from './routes/Login.svelte';
import LoginDigit from './routes/LoginDigit.svelte';
import Register from './routes/Register.svelte';
import ProgramList from './routes/ProgramList.svelte';
import ProgramDetail from './routes/ProgramDetail.svelte';
import NotFound from './routes/NotFound.svelte';

export const routes = {
  // 認証 (最初にアクセスするページ)
  '/': Login,
  '/login': Login,
  '/login/digit': LoginDigit,
  '/register': Register,

  // プラン (ログイン後のメインページ)
  '/plan/list': ProgramList,
  '/plan/detail/:id': ProgramDetail,

  // 404
  '*': NotFound,
};
