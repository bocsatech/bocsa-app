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

  const [username, setUsername] = useState(
    localStorage.getItem('remember_username') || ''
  )

  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)

  const [randomNumber, setRandomNumber] = useState(0)
  const [operator, setOperator] = useState('+')
  const [answer, setAnswer] = useState('')

  useEffect(() => {
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
      answer: Number(answer)
    })

    const user = result.data?.[0]

    if (!user?.success) {
      alert('Hibás belépés')
      return
    }

    localStorage.setItem('bocsa_logged_in', 'true')

    if (remember) {
      localStorage.setItem('remember_username', username)
    }

    router.push('/')
  }

  return (
    <div
      style={{
        height: '100vh',
        background: '#f5f5f5',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div
        style={{
          width: 400,
          background: 'white',
          padding: 40,
          borderRadius: 12,
          boxShadow: '0 0 20px rgba(0,0,0,0.1)'
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            fontSize: 36,
            fontWeight: 800,
            marginBottom: 30,
            color: 'black'
          }}
        >
          BOCSA TECH
        </h1>

        <input
          placeholder="Felhasználónév"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: '100%',
            padding: 12,
            marginBottom: 15,
            color: 'black',
            border: '1px solid #ccc',
            borderRadius: 8
          }}
        />

        <input
          type="password"
          placeholder="Jelszó"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: 12,
            marginBottom: 15,
            color: 'black',
            border: '1px solid #ccc',
            borderRadius: 8
          }}
        />

        <div
          style={{
            color: 'black',
            marginBottom: 10,
            fontWeight: 600
          }}
        >
          10 {operator} {randomNumber} = ?
        </div>

        <input
          placeholder="Eredmény"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          style={{
            width: '100%',
            padding: 12,
            marginBottom: 15,
            color: 'black',
            border: '1px solid #ccc',
            borderRadius: 8
          }}
        />

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            color: 'black',
            marginBottom: 20
          }}
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={() => setRemember(!remember)}
          />
          Felhasználónév megjegyzése
        </label>

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: 14,
            background: '#ff8800',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Belépés
        </button>
      </div>
    </div>
  )
}
