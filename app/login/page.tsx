'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)

  const [randomNumber, setRandomNumber] = useState(0)
  const [operator, setOperator] = useState('+')
  const [answer, setAnswer] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUsername = window.localStorage.getItem('remember_username')

      if (savedUsername) {
        setUsername(savedUsername)
      }
    }

    const rand = Math.floor(Math.random() * 20) + 1
    const op = Math.random() > 0.5 ? '+' : '-'

    setRandomNumber(rand)
    setOperator(op)
  }, [])

  async function handleLogin() {
    const result = await supabase.rpc('verify_login_challenge', {
      input_username: username,
      input_password: password,
      operator: operator,
      random_number: randomNumber,
      user_answer: Number(answer)
    })

    if (result.data === true) {
      if (remember && typeof window !== 'undefined') {
        window.localStorage.setItem('remember_username', username)
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('logged_in', 'true')
      }

      router.push('/')
    } else {
      alert('Hibás belépés')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f5f5'
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '40px',
          borderRadius: '20px',
          width: '420px',
          boxShadow: '0 0 20px rgba(0,0,0,0.1)'
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            fontSize: '36px',
            fontWeight: 'bold',
            color: '#c85a00',
            marginBottom: '30px'
          }}
        >
          BOCSA TECH
        </h1>

        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            placeholder="Felhasználónév"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '18px',
              color: 'black',
              border: '1px solid #ccc',
              borderRadius: '10px'
            }}
          />
        </div>

        <div style={{ marginBottom: '15px' }}>
          <input
            type="password"
            placeholder="Jelszó"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '18px',
              color: 'black',
              border: '1px solid #ccc',
              borderRadius: '10px'
            }}
          />
        </div>

        <div
          style={{
            marginBottom: '15px',
            fontSize: '28px',
            fontWeight: 'bold',
            color: 'black'
          }}
        >
          10 {operator} {randomNumber} = ?
        </div>

        <div style={{ marginBottom: '20px' }}>
          <input
            type="number"
            placeholder="Eredmény"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '18px',
              color: 'black',
              border: '1px solid #ccc',
              borderRadius: '10px'
            }}
          />
        </div>

        <div
          style={{
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'black'
          }}
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />

          <span>Felhasználónév megjegyzése</span>
        </div>

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: '16px',
            background: '#c85a00',
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '20px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          Belépés
        </button>
      </div>
    </div>
  )
}
