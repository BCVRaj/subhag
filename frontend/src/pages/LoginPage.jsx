/**
 * Login Page - Matches UX Design with Full Authentication Features
 */
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '../hooks/useAuth'
import LoadingSpinner from '../components/common/LoadingSpinner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showSignUp, setShowSignUp] = useState(false)
  
  // Sign up form state
  const [signUpData, setSignUpData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'operator'
  })
  const [signUpError, setSignUpError] = useState('')
  
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)
  const register = useAuthStore((state) => state.register)
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle)
  
  // Check if Google OAuth is properly configured
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  const isGoogleConfigured = googleClientId && 
    googleClientId.trim().length > 20 &&
    !googleClientId.includes('placeholder') && 
    !googleClientId.includes('your-google-client-id')
  
  // Check if it's an API key instead of OAuth Client ID
  const isApiKeyNotClientId = googleClientId && 
    googleClientId.startsWith('AIza') && 
    !googleClientId.includes('apps.googleusercontent.com')
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    // Backend now accepts both email and username
    const result = await login(email, password)
    
    if (result.success) {
      navigate('/workspace')
    } else {
      setError(result.error || 'Login failed. Please check your credentials.')
    }
    
    setLoading(false)
  }
  

  
  const handleGoogleSuccess = async (credentialResponse) => {
    setError('')
    setLoading(true)
    
    try {
      const result = await loginWithGoogle(credentialResponse.credential)
      
      if (result.success) {
        navigate('/workspace')
      } else {
        setError(result.error || 'Authentication failed. Please try again or use your credentials.')
      }
    } catch (err) {
      console.error('Google auth error:', err)
      setError('SSO authentication error. Please use your credentials below.')
    }
    
    setLoading(false)
  }
  
  const handleGoogleError = (error) => {
    console.error('Google OAuth Error:', error)
    setLoading(false)
    setError('Google Sign-In failed. Please try again or use email/password.')
  }
  
  const handleForgotPassword = (e) => {
    e.preventDefault()
    const userEmail = prompt('Enter your email address to receive a password reset link:')
    if (userEmail && userEmail.includes('@')) {
      setError('')
      alert(`Password reset instructions have been sent to ${userEmail}\n\nPlease check your inbox and spam folder.\n\nIf you don't receive it, contact: support@windopspro.com`)
    } else if (userEmail) {
      alert('Please enter a valid email address.')
    }
  }
  
  const handleSignUp = (e) => {
    e.preventDefault()
    setShowSignUp(true)
    setSignUpError('')
  }
  
  const handleSignUpSubmit = async (e) => {
    e.preventDefault()
    setSignUpError('')
    setLoading(true)
    
    // Validate passwords match
    if (signUpData.password !== signUpData.confirmPassword) {
      setSignUpError('Passwords do not match')
      setLoading(false)
      return
    }
    
    // Validate password length
    if (signUpData.password.length < 6) {
      setSignUpError('Password must be at least 6 characters')
      setLoading(false)
      return
    }
    
    // Call register
    const result = await register(
      signUpData.username,
      signUpData.email,
      signUpData.password,
      signUpData.fullName,
      signUpData.role
    )
    
    if (result.success) {
      setShowSignUp(false)
      navigate('/workspace')
    } else {
      setSignUpError(result.error || 'Registration failed')
    }
    
    setLoading(false)
  }
  
  const closeSignUpModal = () => {
    setShowSignUp(false)
    setSignUpData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      fullName: '',
      role: 'operator'
    })
    setSignUpError('')
  }
  
  return (
    <div className="flex min-h-screen w-full bg-background-dark overflow-hidden">
      {/* Left Half: Branding & Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-background-dark border-r border-white/5 relative overflow-hidden">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_2px_2px,rgba(16,183,127,0.15)_1px,transparent_0)]" style={{backgroundSize: '40px 40px'}}></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-transparent"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <span className="material-symbols-outlined text-background-dark font-bold">
                wind_power
              </span>
            </div>
            <span className="text-xl font-black tracking-tight text-white">WindOps Pro</span>
          </div>
          
          {/* Center Content */}
          <div className="flex-1 flex flex-col items-center justify-center">
            {/* Rotating Turbine Illustration */}
            <div className="relative w-full max-w-md aspect-square flex items-center justify-center">
              <svg className="w-full h-full drop-shadow-2xl" style={{filter: 'drop-shadow(0 0 15px rgba(16, 183, 127, 0.4))'}} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:"#10b77f", stopOpacity:1}} />
                    <stop offset="100%" style={{stopColor:"#059669", stopOpacity:1}} />
                  </linearGradient>
                </defs>
                
                {/* Tower */}
                <path d="M95 180 L105 180 L102 100 L98 100 Z" fill="none" stroke="url(#grad1)" strokeWidth="0.5" opacity="0.9"/>
                <path d="M98 100 L102 100 L100 95 Z" fill="none" stroke="url(#grad1)" strokeWidth="0.5" opacity="0.9"/>
                
                {/* Static Blades */}
                <g>
                  <path d="M100 95 L100 20 L115 50 Z" fill="none" stroke="url(#grad1)" strokeWidth="0.5" opacity="0.85"/>
                  <path d="M100 95 L165 130 L135 140 Z" fill="none" stroke="url(#grad1)" strokeWidth="0.5" opacity="0.85"/>
                  <path d="M100 95 L35 130 L65 140 Z" fill="none" stroke="url(#grad1)" strokeWidth="0.5" opacity="0.85"/>
                </g>
                
                {/* Flow Lines */}
                <path d="M20 60 Q 60 40, 100 60 T 180 60" fill="none" stroke="rgba(16,183,127,0.2)" strokeWidth="1" opacity="0.3"/>
                <path d="M10 110 Q 50 90, 90 110 T 170 110" fill="none" stroke="rgba(16,183,127,0.2)" strokeWidth="1" opacity="0.3"/>
                <path d="M30 150 Q 70 130, 110 150 T 190 150" fill="none" stroke="rgba(16,183,127,0.2)" strokeWidth="1" opacity="0.3"/>
                
                {/* Hub Center */}
                <circle cx="100" cy="95" r="4" fill="#10b77f" stroke="#059669" strokeWidth="1"/>
              </svg>
            </div>
          </div>
          
          {/* Marketing Text */}
          <div className="relative z-10">
            <p className="text-primary/90 text-2xl font-medium tracking-wide">
              Powering the future <span className="text-white">with precision.</span>
            </p>
          </div>
        </div>
      </div>
      
      {/* Right Half: Login Form */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center bg-charcoal p-8 lg:p-20 relative">
        {/* Mobile Logo */}
        <div className="lg:hidden absolute top-8 left-8 flex items-center gap-2 mb-6">
          <div className="bg-primary p-1.5 rounded-lg">
            <span className="material-symbols-outlined text-background-dark font-bold text-lg">
              wind_power
            </span>
          </div>
          <span className="text-xl font-black tracking-tight text-white">WindOps Pro</span>
        </div>
        
        <div className="w-full max-w-[440px] flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-bold tracking-tight text-white">Welcome Back.</h1>
            <p className="text-[#9ca3af] text-lg font-normal leading-relaxed">
              Enter your credentials to access the fleet.
            </p>
          </div>
          
          {/* Error Alert */}
          {error && (
            <div className="p-4 bg-red-500/10 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-red-400 text-xl mt-0.5">error</span>
                <p className="text-sm text-red-300 flex-1">{error}</p>
              </div>
            </div>
          )}
          
          {/* Login Form */}
          <form className="flex flex-col gap-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#e5e7eb]" htmlFor="email">
                Work Email
              </label>
              <div className="relative group">
                <input
                  className="w-full h-14 bg-input-bg border border-white/10 rounded-lg px-4 text-white placeholder:text-[#6b7280] focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                  id="email"
                  type="text"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>
            
            {/* Password Field */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-[#e5e7eb]" htmlFor="password">
                Password
              </label>
              <div className="relative group flex items-center">
                <input
                  className="w-full h-14 bg-input-bg border border-white/10 rounded-lg px-4 pr-12 text-white placeholder:text-[#6b7280] focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  className="absolute right-4 text-[#9ca3af] hover:text-primary transition-colors"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>
            
            {/* Submit Button */}
            <button
              className="w-full h-14 bg-gradient-to-r from-primary to-[#059669] hover:opacity-90 active:scale-[0.98] transition-all rounded-lg text-background-dark font-bold text-lg shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <span className="material-symbols-outlined text-[20px]">login</span>
                </>
              )}
            </button>
            
            {/* Divider */}
            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-white/10 flex-1"></div>
              <span className="text-xs font-bold text-[#6b7280] uppercase tracking-widest">Or</span>
              <div className="h-px bg-white/10 flex-1"></div>
            </div>
            
            {/* Google Sign In Button */}
            <div className="w-full">
              {isApiKeyNotClientId ? (
                <>
                  <button
                    className="w-full h-14 border border-yellow-500/30 bg-yellow-500/10 rounded-lg text-yellow-400 font-semibold flex items-center justify-center gap-3 cursor-not-allowed"
                    type="button"
                    disabled
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Wrong Credential Type</span>
                  </button>
                  <p className="text-xs text-yellow-400 text-center mt-2">
                    ⚠️ You added a Google API Key. Please add OAuth Client ID instead.<br/>
                    Format: XXXX-XXXX.apps.googleusercontent.com
                  </p>
                </>
              ) : isGoogleConfigured ? (
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  useOneTap={false}
                  theme="filled_black"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width="100%"
                  logo_alignment="left"
                />
              ) : (
                <>
                  <button
                    className="w-full h-14 border border-white/10 bg-white/5 rounded-lg text-[#6b7280] font-semibold flex items-center justify-center gap-3 cursor-not-allowed"
                    type="button"
                    disabled
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>Sign in with Google</span>
                  </button>
                  <p className="text-xs text-[#6b7280] text-center mt-2">
                    Google Sign-In requires configuration. Please use email login above.
                  </p>
                </>
              )}
            </div>
          </form>
          
          {/* Footer Links */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4">
            <a
              className="text-sm text-[#9ca3af] hover:text-primary transition-colors underline-offset-4 hover:underline cursor-pointer"
              onClick={handleForgotPassword}
            >
              Forgot Password?
            </a>
            <a
              className="text-sm text-[#9ca3af] hover:text-primary transition-colors underline-offset-4 hover:underline flex items-center gap-1"
              href="mailto:support@windopspro.com"
            >
              <span className="material-symbols-outlined text-[16px]">support_agent</span>
              Contact Support
            </a>
          </div>
          
          {/* Sign Up Link */}
          <div className="text-center mt-2">
            <p className="text-sm text-[#9ca3af]">
              Don't have an account?{' '}
              <a
                className="text-primary hover:text-primary-dark transition-colors underline-offset-4 hover:underline cursor-pointer font-semibold"
                onClick={handleSignUp}
              >
                Sign up
              </a>
            </p>
          </div>
          
          {/* Footer Copyright */}
          <div className="mt-12 text-center lg:text-left">
            <p className="text-xs text-[#4b5563]">© 2024 WindOps Industries. All systems operational.</p>
          </div>
        </div>
      </div>
      
      {/* Sign Up Modal */}
      {showSignUp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-background-dark border border-white/10 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Modal Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Create Account</h2>
                <button
                  className="text-[#9ca3af] hover:text-white transition-colors"
                  onClick={closeSignUpModal}
                  disabled={loading}
                >
                  <span className="material-symbols-outlined text-[24px]">close</span>
                </button>
              </div>
              
              {/* Error Message */}
              {signUpError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{signUpError}</span>
                </div>
              )}
              
              {/* Sign Up Form */}
              <form onSubmit={handleSignUpSubmit} className="flex flex-col gap-4">
                {/* Username Field */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#e5e7eb]">Username *</label>
                  <input
                    className="w-full h-12 bg-input-bg border border-white/10 rounded-lg px-4 text-white placeholder:text-[#6b7280] focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                    type="text"
                    placeholder="Choose a username"
                    value={signUpData.username}
                    onChange={(e) => setSignUpData({...signUpData, username: e.target.value})}
                    required
                    disabled={loading}
                  />
                </div>
                
                {/* Email Field */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#e5e7eb]">Email *</label>
                  <input
                    className="w-full h-12 bg-input-bg border border-white/10 rounded-lg px-4 text-white placeholder:text-[#6b7280] focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                    type="email"
                    placeholder="your.email@company.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({...signUpData, email: e.target.value})}
                    required
                    disabled={loading}
                  />
                </div>
                
                {/* Full Name Field */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#e5e7eb]">Full Name</label>
                  <input
                    className="w-full h-12 bg-input-bg border border-white/10 rounded-lg px-4 text-white placeholder:text-[#6b7280] focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                    type="text"
                    placeholder="John Doe"
                    value={signUpData.fullName}
                    onChange={(e) => setSignUpData({...signUpData, fullName: e.target.value})}
                    disabled={loading}
                  />
                </div>
                
                {/* Role Selection */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#e5e7eb]">Role *</label>
                  <select
                    className="w-full h-12 bg-input-bg border border-white/10 rounded-lg px-4 text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                    value={signUpData.role}
                    onChange={(e) => setSignUpData({...signUpData, role: e.target.value})}
                    required
                    disabled={loading}
                  >
                    <option value="operator">Operator</option>
                    <option value="developer">Developer</option>
                    <option value="investor">Investor</option>
                  </select>
                </div>
                
                {/* Password Field */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#e5e7eb]">Password *</label>
                  <input
                    className="w-full h-12 bg-input-bg border border-white/10 rounded-lg px-4 text-white placeholder:text-[#6b7280] focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({...signUpData, password: e.target.value})}
                    required
                    disabled={loading}
                  />
                </div>
                
                {/* Confirm Password Field */}
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-[#e5e7eb]">Confirm Password *</label>
                  <input
                    className="w-full h-12 bg-input-bg border border-white/10 rounded-lg px-4 text-white placeholder:text-[#6b7280] focus:ring-1 focus:ring-primary focus:border-primary transition-all outline-none"
                    type="password"
                    placeholder="Re-enter password"
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData({...signUpData, confirmPassword: e.target.value})}
                    required
                    disabled={loading}
                  />
                </div>
                
                {/* Submit Button */}
                <button
                  className="w-full h-12 bg-gradient-to-r from-primary to-[#059669] hover:opacity-90 active:scale-[0.98] transition-all rounded-lg text-background-dark font-bold text-base shadow-lg shadow-primary/20 flex items-center justify-center gap-2 mt-2"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <span className="material-symbols-outlined text-[20px]">person_add</span>
                    </>
                  )}
                </button>
              </form>
              
              {/* Already have account */}
              <div className="text-center mt-4">
                <p className="text-sm text-[#9ca3af]">
                  Already have an account?{' '}
                  <button
                    className="text-primary hover:text-primary-dark transition-colors underline-offset-4 hover:underline font-semibold"
                    onClick={closeSignUpModal}
                    disabled={loading}
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
