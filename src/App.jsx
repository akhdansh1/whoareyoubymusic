import { useEffect, useState, useNavigate } from 'react'
import './App.css'
import supabase from './supabaseClient'

function App() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)


  const LogIn = async () => {
  try {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'spotify',
      options: {
        redirectTo: 'https://whoareyoubymusic-nine.vercel.app/result',
        scopes: 'user-top-read user-read-private user-read-email',
      }
    })
  } catch (err) {
    setError('An unexpected error occurred')
    console.error('Login error:', err)
  } finally {
    setLoading(false)
  }
}

    useEffect(() => {
        const getSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession()
                
                if (error) {
                    console.error('Session error:', error)
                    return
                }
                
                setUser(session?.user || null)
            } catch (error) {
                console.error('Error getting session:', error)
            } finally {
                setLoading(false)
            }
        }

        getSession()
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                console.log('Auth state changed:', event, session)
                setUser(session?.user || null)
                setLoading(false)
            }
        )

        return () => subscription?.unsubscribe()
    }, [])

  return (
    <main className='header-bg '>
      <div className="header flex flex-col items-center justify-center h-screen">
        <h1 className='font-bold text-center text-3xl'>Discover your <span className='bg-gradient-to-br from-[#E391FF] to-[#B054CF] bg-clip-text text-transparent'>personality</span> based on <br /> your <span className='bg-gradient-to-br from-[#65CCFF] to-[#4570DD] bg-clip-text text-transparent'>music</span> taste</h1>
        
        {error && (
          <div className='mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg max-w-md text-center'>
            <p className='font-semibold'>Authentication Error</p>
            <p className='text-sm mt-1'>{error}</p>
            {error.includes('email') && error.includes('verification') && (
              <p className='text-sm mt-2'>Please check your Spotify email and verify your account, then try logging in again.</p>
            )}
          </div>
        )}
        
        <button 
          onClick={LogIn} 
          className='mt-3 text-sm font-bold border-2 border-white rounded-full px-3 py-2 hover:bg-white hover:text-black transition-colors '
        >
          {loading ? 'Connecting...' : 'Login to Spotify'}
        </button>
        
      </div>
    </main>
  )
}

export default App
