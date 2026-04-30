/**
 * ErrorBoundary — last-resort barrier so the admin panel doesn't render
 * a blank page on a runtime crash. Wraps the whole router. Shows the
 * actual JS error + stack so we can debug the deploy.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; info: ErrorInfo | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Log so we always have something in the browser console.
    // eslint-disable-next-line no-console
    console.error('[admin-panel] uncaught render error:', error, info);
    this.setState({ error, info });
  }

  reload = () => { window.location.reload(); };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
        maxWidth: 920,
        margin: '40px auto',
        padding: 24,
        background: '#fff',
        border: '1px solid #fecaca',
        borderRadius: 16,
        boxShadow: '0 10px 30px -10px rgba(0,0,0,.1)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '4px 10px',
          background: '#fee2e2', color: '#991b1b',
          borderRadius: 999, fontSize: 12, fontWeight: 700,
        }}>RUNTIME ERROR</div>

        <h1 style={{ fontSize: 24, marginTop: 12, marginBottom: 4, color: '#111' }}>
          Admin Panel не смог отрендериться
        </h1>
        <p style={{ color: '#6b7280', fontSize: 14, marginTop: 0 }}>
          Это ErrorBoundary. Если вы это видите — JS бандл загрузился, но React
          поймал исключение во время render. Сообщение ниже укажет причину.
        </p>

        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca',
          borderRadius: 8, padding: 12, marginTop: 16,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 13, color: '#991b1b', whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          <strong>{this.state.error.name}: </strong>{this.state.error.message}
        </div>

        {this.state.error.stack && (
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', color: '#374151', fontSize: 13 }}>
              Stack trace
            </summary>
            <pre style={{
              marginTop: 8, padding: 12,
              background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
              fontSize: 11, color: '#374151',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: 320, overflow: 'auto',
            }}>{this.state.error.stack}</pre>
          </details>
        )}

        {this.state.info?.componentStack && (
          <details style={{ marginTop: 8 }}>
            <summary style={{ cursor: 'pointer', color: '#374151', fontSize: 13 }}>
              Component stack
            </summary>
            <pre style={{
              marginTop: 8, padding: 12,
              background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 8,
              fontSize: 11, color: '#374151',
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: 320, overflow: 'auto',
            }}>{this.state.info.componentStack}</pre>
          </details>
        )}

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button onClick={this.reload}
            style={{
              padding: '8px 14px', background: '#2563eb', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
            }}>
            Перезагрузить страницу
          </button>
          <a href="/admin/" style={{
            padding: '8px 14px', background: '#fff', color: '#111',
            border: '1px solid #d1d5db', borderRadius: 8, fontWeight: 500,
            textDecoration: 'none', display: 'inline-block',
          }}>
            На главную
          </a>
        </div>
      </div>
    );
  }
}
