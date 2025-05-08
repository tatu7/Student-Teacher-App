# Student-Teacher App

A mobile application built with React Native and Expo that provides a platform for teachers and students with role-based authentication powered by Supabase.

## Features

- **Authentication** with email and password using Supabase
- **Role-based access control** for Teachers and Students
- **Dynamic navigation** based on user role
- **Secure token storage** using Expo SecureStore
- **Password reset** functionality
- **Role-specific dashboards** for teachers and students

## Prerequisites

- Node.js (v14 or newer)
- npm or Yarn
- Expo CLI (`npm install -g expo-cli`)
- Supabase account and project

## Setup

1. Clone the repository:

```bash
git clone https://github.com/your-username/Student-Teacher-App.git
cd Student-Teacher-App
```

2. Install dependencies:

```bash
npm install
```

3. Create a Supabase project:

   - Sign up at [Supabase](https://supabase.io)
   - Create a new project
   - Get your Supabase URL and anon key

4. Set up the Supabase database:

   - Create a `user_profiles` table with the following schema:
     - `id` (uuid, primary key, auto-generated)
     - `user_id` (uuid, references auth.users.id)
     - `email` (text)
     - `role` (text, can be 'teacher' or 'student')
     - `created_at` (timestamp with timezone)

5. Update the Supabase configuration:

   - Open `lib/supabase.ts`
   - Replace `YOUR_SUPABASE_URL` with your Supabase URL
   - Replace `YOUR_SUPABASE_ANON_KEY` with your Supabase anon key

6. Run the app:

```bash
npm start
```

## Project Structure

- `/app` - Expo Router app directory
  - `/auth` - Authentication screens (login, signup, forgot password)
  - `/teacher` - Teacher-specific screens
  - `/student` - Student-specific screens
- `/context` - React Context for state management
- `/lib` - Utility functions and configurations
  - `/supabase.ts` - Supabase client setup

## Authentication Flow

1. Users can sign up with email, password, and role selection (teacher or student)
2. Supabase creates a user record in the auth.users table
3. Our app adds the role information to the user_profiles table
4. On login, the app fetches the user's role from the user_profiles table
5. The app redirects to the appropriate dashboard based on the user's role

## License

MIT
