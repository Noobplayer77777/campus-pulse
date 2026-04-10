import React, { useState } from 'react';
import { loginUser } from '../services/authService';
import { validateEmail, validatePassword } from '../utils/helpers';
import { useUI } from '../hooks/useUI';

export default function LoginForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const { addNotification } = useUI();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEmail(formData.email)) {
      addNotification('Please enter a valid email address', 'warning');
      return;
    }

    if (!validatePassword(formData.password)) {
      addNotification('Password must be at least 6 characters', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      const user = await loginUser(formData.email, formData.password);
      addNotification(`Welcome back, ${user.name}!`, 'success');

      setFormData({
        email: '',
        password: '',
      });

      if (onSuccess) onSuccess(user);
    } catch (error) {
      const errorMsg = error.message || 'Login failed. Please check your credentials.';
      addNotification(errorMsg, 'error');
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg relative">
      <div className="bg-surface-container-lowest border-[4px] border-black p-8 md:p-12 neo-shadow-xl">
        <h1 className="font-headline font-black text-4xl md:text-5xl uppercase leading-none tracking-tight mb-10">
          WELCOME BACK
        </h1>
        <form className="space-y-8" onSubmit={handleSubmit}>
          <div>
            <label className="font-label text-sm font-bold uppercase block mb-3">Email Address</label>
            <input
              className="w-full h-14 px-4 bg-surface border-[3px] border-black outline-none font-label text-lg focus:border-primary focus:shadow-[0_0_0_3px_rgba(106,91,0,0.1)]"
              placeholder="your.email@college.edu"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="font-label text-sm font-bold uppercase block mb-3">Password</label>
            <input
              className="w-full h-14 px-4 bg-surface border-[3px] border-black outline-none font-label text-lg focus:border-primary focus:shadow-[0_0_0_3px_rgba(106,91,0,0.1)]"
              placeholder="Your password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-16 bg-primary-container border-[4px] border-black font-headline font-black text-xl uppercase tracking-widest neo-shadow-hover transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                LOGGING IN...
              </>
            ) : (
              <>
                LOG IN
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t-[3px] border-black/10 flex flex-col gap-4 text-center">
          <p className="font-label text-sm font-bold uppercase">New to the pulse?</p>
          <p className="font-body text-on-surface-variant">
            Create an account to start discovering events
          </p>
        </div>
      </div>
    </div>
  );
}
