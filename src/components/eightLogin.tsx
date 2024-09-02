"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiR } from '~/trpc/react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type EightLoginDialog = z.infer<typeof loginSchema>;

interface EightLoginDialogProps {
  onLoginSuccess: () => void;
}

export const EightLoginDialog: React.FC<EightLoginDialogProps> = ({ onLoginSuccess }) => {
  const form = useForm<EightLoginDialog>({
    resolver: zodResolver(loginSchema),
  });
  const { register, handleSubmit, formState: { errors } } = form;

  const loginMutation = apiR.user.login.useMutation({
    onSuccess: () => {
      // Handle successful login
      console.log('Login successful');
      onLoginSuccess();
    },
    onError: (error: { message: unknown; }) => {
      // Handle login error
      console.error('Login failed:', error.message);
    },
  });

  const onSubmit = (data: EightLoginDialog) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-xl">
      <h2 className="text-2xl font-bold mb-4 text-center text-gray-800">Login to Eight Sleep</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-gray-800">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
          <input
            {...register('email')}
            type="email"
            id="email"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
          {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
          <input
            {...register('password')}
            type="password"
            id="password"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? 'Logging in...' : 'Login'}
        </button>
        {loginMutation.isError && (
        <p className="mt-4 text-sm text-red-600 text-center">{loginMutation.error.message}</p>
      )}
    </form>
    </div>
  );
};