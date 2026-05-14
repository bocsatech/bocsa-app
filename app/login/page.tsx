'use client'

import { useEffect, useState } from 'react'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [answer, setAnswer] = useState('')
  const [remember, setRemember] = useState(true)

  const [randomNumber, setRandomNumber] = useState(0)
  const [operator, setOperator] = useState('+')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedUsername =
        window.localStorage.getItem('remember_username')

      if (savedUsername) {
        setUsername(savedUsername)
      }

      const op = Math.random() > 0.5 ? '+' : '-'

      let rand = 0

      if (op === '+') {
        rand = Math.floor(Math.random() * 20) + 1
      } else {
        rand = Math.floor(Math.random() * 9) + 1
      }

      setOperator(op)
      setRandomNumber(rand)
    }
  }, [])

  function handleLogin() {
    const secretNumber = 10

    const expected =
      operator === '+'
        ? secretNumber + randomNumber
        : secretNumber - randomNumber

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
      }

      document.cookie =
        'bocsa_logged_in=true; path=/; max-age=86400'

      window.location.href = '/'
    } else {
      alert('Falsche Anmeldedaten')
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
          width: 520,
          maxWidth:  '95%',
          background: 'white',
          padding: 40,
          borderRadius: 20,
          boxShadow: '0 5px 30px rgba(0,0,0,0.1)'
        }}
      >
        <h1
          style={{
            textAlign: 'center',
            color: '#9a3f00',
            fontWeight: 800,
            marginBottom: 40,
            fontSize: 48
            whiteSpace: 'nowarp'
          }}
        >
          BOCSA TECH
        </h1>

        <input
          placeholder="Benutzername"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            width: '100%',
            padding: 18,
            marginBottom: 20,
            borderRadius: 12,
            border: '1px solid #ccc',
            fontSize: 20,
            color: 'black'
          }}
        />

        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: '100%',
            padding: 18,
            marginBottom: 20,
            borderRadius: 12,
            border: '1px solid #ccc',
            fontSize: 20,
            color: 'black'
          }}
        />

        <div
          style={{
            fontSize: 34,
            fontWeight: 800,
            marginBottom: 20,
            color: 'black'
          }}
        >
          {operator} {randomNumber} = ?
        </div>

        <input
          type="number"
          placeholder="Ergebnis"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          style={{
            width: '100%',
            padding: 18,
            marginBottom: 20,
            borderRadius: 12,
            border: '1px solid #ccc',
            fontSize: 20,
            color: 'black'
          }}
        />

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 30,
            color: 'black'
          }}
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />

          Benutzername merken
        </label>

        <button
          onClick={handleLogin}
          style={{
            width: '100%',
            padding: 18,
            background: '#9a3f00',
            color: 'white',
            border: 'none',
            borderRadius: 12,
            fontSize: 28,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Anmelden
        </button>
      </div>
    </div>
  )
}
