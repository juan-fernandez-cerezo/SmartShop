import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export const SignUp = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'Consumer' | 'Supermarket'>('Consumer');
  
  // Extra fields based on role
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [marketName, setMarketName] = useState('');
  const [location, setLocation] = useState('');

  const handleSignUp = async () => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { 
        role,
        first_name: role === 'Consumer' ? firstName : undefined,
        last_name: role === 'Consumer' ? lastName : undefined,
        market_name: role === 'Supermarket' ? marketName : undefined,
        location: role === 'Supermarket' ? location : undefined,
      },
      emailRedirectTo: window.location.origin
    }
  });

  if (error) {
    // Supabase returns specific error messages
    if (error.message.includes("already registered") || error.status === 422) {
      alert("This account already exists. Try logging in instead!");
    } else {
      alert("Error: " + error.message);
    }
    return;
  }

  // Check if user is returned but identity is empty (another way Supabase signals existing users)
  if (data.user && data.user.identities?.length === 0) {
    alert("This email is already taken. Please use a different one or log in.");
    return;
  }

  alert("Success! Please check your email to verify your account.");
};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
      <h2>Create Account</h2>
      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} />
      
      <select value={role} onChange={(e) => setRole(e.target.value as any)}>
        <option value="Consumer">I am a Customer</option>
        <option value="Supermarket">I am a Supermarket</option>
      </select>

      {role === 'Consumer' ? (
        <>
          <input placeholder="First Name" onChange={(e) => setFirstName(e.target.value)} />
          <input placeholder="Last Name" onChange={(e) => setLastName(e.target.value)} />
        </>
      ) : (
        <>
          <input placeholder="Supermarket Name" onChange={(e) => setMarketName(e.target.value)} />
          <input placeholder="Location Address" onChange={(e) => setLocation(e.target.value)} />
        </>
      )}

      <button onClick={handleSignUp}>Register</button>
    </div>
  );
};