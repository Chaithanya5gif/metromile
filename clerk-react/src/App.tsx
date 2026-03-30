import './App.css'
import { Show, SignInButton, UserButton, useUser } from '@clerk/react'
import { useEffect } from 'react'

function App() {
  const { isLoaded, isSignedIn, user } = useUser()

  useEffect(() => {
    // If running inside a ReactNativeWebView and user is signed in, send the token/user back
    if (isLoaded && isSignedIn && user && (window as any).ReactNativeWebView) {
      const payload = {
        type: 'CLERK_AUTH',
        user: {
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          fullName: user.fullName || '',
        }
      }
      ;(window as any).ReactNativeWebView.postMessage(JSON.stringify(payload))
    }
  }, [isLoaded, isSignedIn, user])

  return (
    <>
      <header>
        <Show when="signed-out">
          <div style={{ display: 'flex', gap: '10px', flexDirection: 'column', alignItems: 'center', marginTop: '50px' }}>
            <h2>MetroMile Login</h2>
            <SignInButton mode="modal">
              <button style={{ padding: '10px 20px', fontSize: '16px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: '8px' }}>Sign In to MetroMile</button>
            </SignInButton>
          </div>
        </Show>
        <Show when="signed-in">
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '50px' }}>
            <UserButton />
            <h3 style={{ marginLeft: '10px' }}>Successfully logged in! Returning to app...</h3>
          </div>
        </Show>
      </header>
    </>
  )
}

export default App
