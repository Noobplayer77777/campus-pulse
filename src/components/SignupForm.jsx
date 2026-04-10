import React, { useState } from 'react';
import { registerUser } from '../services/authService';
import { validateEmail, validatePassword } from '../utils/helpers';
import { useUI } from '../hooks/useUI';

export default function SignupForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    regNo: '',
    email: '',
    password: '',
    confirmPassword: '',
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

    if (!formData.name.trim()) {
      addNotification('Please enter your name', 'warning');
      return;
    }

    if (!formData.regNo.trim()) {
      addNotification('Please enter your registration number', 'warning');
      return;
    }

    if (!validateEmail(formData.email)) {
      addNotification('Please enter a valid email address', 'warning');
      return;
    }

    if (!validatePassword(formData.password)) {
      addNotification('Password must be at least 6 characters', 'warning');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      addNotification('Passwords do not match', 'warning');
      return;
    }

    setIsLoading(true);

    try {
      const user = await registerUser(
        formData.email,
        formData.password,
        formData.name,
        formData.regNo,
        'student'
      );

      addNotification(`Welcome, ${user.name}!`, 'success');

      setFormData({
        name: '',
        regNo: '',
        email: '',
        password: '',
        confirmPassword: '',
      });

      if (onSuccess) onSuccess(user);
    } catch (error) {
      const errorMsg = error.message || 'An error occurred during signup';
      addNotification(errorMsg, 'error');
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg relative">
      <div className="bg-surface-container-lowest border-[4px] border-black p-8 md:p-12 neo-shadow-xl">
        <h1 className="font-headline font-black text-4xl md:text-5xl uppercase leading-none tracking-tight mb-10">
          JOIN THE SOCIETY
        </h1>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label className="font-label text-sm font-bold uppercase block mb-2">Full Name</label>
            <input
              className="w-full h-12 px-4 bg-surface border-[3px] border-black outline-none font-label text-base focus:border-primary"
              placeholder="Your full name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="font-label text-sm font-bold uppercase block mb-2">Registration Number</label>
            <input
              className="w-full h-12 px-4 bg-surface border-[3px] border-black outline-none font-label text-base focus:border-primary"
              placeholder="e.g., CSE2024001"
              type="text"
              name="regNo"
              value={formData.regNo}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="font-label text-sm font-bold uppercase block mb-2">Email Address</label>
            <input
              className="w-full h-12 px-4 bg-surface border-[3px] border-black outline-none font-label text-base focus:border-primary"
              placeholder="your.email@college.edu"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="font-label text-sm font-bold uppercase block mb-2">Password</label>
            <input
              className="w-full h-12 px-4 bg-surface border-[3px] border-black outline-none font-label text-base focus:border-primary"
              placeholder="At least 6 characters"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <label className="font-label text-sm font-bold uppercase block mb-2">Confirm Password</label>
            <input
              className="w-full h-12 px-4 bg-surface border-[3px] border-black outline-none font-label text-base focus:border-primary"
              placeholder="Confirm your password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-16 bg-primary-container border-[4px] border-black font-headline font-black text-xl uppercase tracking-widest neo-shadow-hover transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin"></span>
                CREATING ACCOUNT...
              </>
            ) : (
              <>
                CREATE ACCOUNT
                <span className="material-symbols-outlined">arrow_forward</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-10 pt-8 border-t-[3px] border-black/10 flex flex-col gap-4 text-center">
          <p className="font-label text-sm font-bold uppercase">Already in the pulse?</p>
          <p className="font-body text-on-surface-variant">Back to login above</p>
        </div>
      </div>
    </div>
  );
}
