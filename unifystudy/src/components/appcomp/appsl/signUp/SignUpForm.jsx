import React from "react";

export default function SignUpForm({
  isLogin,
  email,
  setEmail,
  password,
  setPassword,
  username,
  setUsername,
  showPassword,
  setShowPassword,
  handleSubmit,
  handleGoogleSignIn,
  toggleLoginMode,
  error,
  success,
  keepLoggedIn,
  setKeepLoggedIn,
}) {
  return (
    <form className="signup-form" onSubmit={handleSubmit}>
      {!isLogin && (
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            placeholder="Enter a username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
      )}

      <div className="form-group">
        <label>Email</label>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>

      <div className="form-group password-group">
        <label>Password</label>
        <div className="password-wrapper">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="button"
            className="toggle-password"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {isLogin && (
        <div className="form-group checkbox-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
          <input
            type="checkbox"
            id="keepLoggedIn"
            checked={keepLoggedIn}
            onChange={(e) => setKeepLoggedIn(e.target.checked)}
            style={{ width: 'auto', margin: 0 }}
          />
          <label htmlFor="keepLoggedIn" style={{ margin: 0, fontSize: '0.9rem', cursor: 'pointer' }}>
            Keep me logged in
          </label>
        </div>
      )}

      <button type="submit" className="btn-primary">
        {isLogin ? "Log In" : "Sign Up"}
      </button>

      <div className="divider"></div>
      <h1>OR</h1>

      <button className="btn-google" onClick={handleGoogleSignIn}>
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg"
          alt="Google logo"
          className="google-logo"
        />
        <span>{isLogin ? "Log in with Google" : "Sign up with Google"}</span>
      </button>

      <p className="toggle-text">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <span className="toggle-btn" onClick={toggleLoginMode}>
          {isLogin ? "Sign Up" : "Log In"}
        </span>
      </p>

      {error && <p className="error-msg">{error}</p>}
      {success && <p className="success-msg">{success}</p>}
    </form>
  );
}
