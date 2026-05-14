'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)

  const [num1, setNum1] = useState(0)
  const [num2, setNum2] = useState(0)
  const [answer, setAnswer] = useState('')

  useEffect(() => {
    const saved = window.localStorage.getItem('remember_username')

    if (saved) {
      setUsername(saved)
    }

    setNum1(Math.floor(Math.random() * 20) + 1)
    setNum2(Math.floor(Math.random() * 20) + 1)
  }, [])

  function handleLogin() {
    const expected = num1 + num2

    if (
      username === 'admin' &&
      password === 'AdMiN' &&
      Number(answer) === expected
    ) {
      if (remember) {
        window.localStorage.setItem(
          'remember_username',
          username
        )
      } else {
        window.localStorage.removeItem(
          'remember_username'
        )
      }

      window.localStorage.setItem('logged_in', 'true')

      router.push('/')
    } else {
      alert('Falsche Login Daten')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: '#f5f5f5',
      }}
    >
      <div
        style={{
          width: 520,
          maxWidth: '95%',
          background: 'white',
          padding: 40,
          borderRadius: 20,
          boxShadow: '0 5px 30px rgba(0,0,0,0.1)',
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            color: '#9a3f00',
            fontWeight: 800,
            marginBottom: 40,
            fontSize: 48,
            whiteSpace: 'nowrap',
          }}
        >
          BOCSA TECH
        </h1>

        <input
          placeholder="Benutzername"
          value={username}
          onChange={(e) =>
            setUsername(e.target.value)
          }
          style={{
            width: '100%',
            padding: 20,
            marginBottom: 20,
            borderRadius: 12,
            border: '1px solid #ccc',
            fontSize: 18,
            color: 'black',
          }}
        />

        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          style={{
            width: '100%',
            padding: 20,
            marginBottom: 20,
            borderRadius: 12,
            border: '1px solid #ccc',
            fontSize: 18,
            color: 'black',
          }}
        />

        <div
          style={{
            fontSize: 40,
            fontWeight: 'bold',
            marginBottom: 20,
            color: 'black',
          }}
        >
          ? + ? =
        </div>

        <input
          type="number"
          placeholder="Ergebnis"
          value={answer}
          onChange={(e) =>
            setAnswer(e.target.value)
          }
          style={{
            width: '100%',
            padding: 20,
            marginBottom: 20,
            borderRadius: 12,
            border: '1px solid #ccc',
            fontSize: 18,
            color: 'black',
          }}
        />

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 30,
            color: 'black',
          }}
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={() =>
              setRemember(!remember)
            }
          />
          Benutzername merken
        </label>

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: 20,
            background: '#9a3f00',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: 24,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Anmelden
        </button>
      </div>
    </div>
  )
}
