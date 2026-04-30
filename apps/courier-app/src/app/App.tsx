import { RouterProvider } from 'react-router';
import { router } from './routes';
import { I18nProvider } from './i18n';
import { CourierStoreProvider } from './store/CourierStore';

export default function App() {
  return (
    <I18nProvider>
      <CourierStoreProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </CourierStoreProvider>
    </I18nProvider>
  );
}
