import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 text-center gap-4">
          <p className="text-5xl">💥</p>
          <h1 className="text-xl font-bold text-white">Une erreur inattendue s'est produite</h1>
          <p className="text-zinc-500 text-sm max-w-sm font-mono">
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.replace('/')}
            className="mt-2 bg-brand text-white font-bold px-5 py-2.5 rounded-xl
                       hover:bg-brand-dark active:scale-95 transition-all"
          >
            Retour à l'accueil
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
