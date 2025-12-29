
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { motion } from "framer-motion";
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";

// Validation Schemas
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = loginSchema.extend({
  username: z.string().min(3, "Username must be at least 3 characters").optional(),
});

type SignUpFormValues = z.infer<typeof signupSchema>;

interface SignUpFormProps {
    isLogin: boolean;
    onSubmit: (data: SignUpFormValues) => void;
    handleGoogleSignIn: () => void;
    toggleLoginMode: () => void;
    serverError: string;
    isLoading: boolean;
    keepLoggedIn: boolean;
    setKeepLoggedIn: (value: boolean) => void;
}

const SignUpForm: React.FC<SignUpFormProps> = ({
  isLogin,
  onSubmit, // Handler passed from parent
  handleGoogleSignIn,
  toggleLoginMode,
  serverError,
  isLoading,
  keepLoggedIn,
  setKeepLoggedIn
}) => {
  const [showPassword, setShowPassword] = React.useState(false);

  // Form Hooks
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema),
    mode: "onBlur"
  });

  return (
    <form className="signup-form" onSubmit={handleSubmit(onSubmit)}>
      {serverError && (
        <div className="error-message" role="alert">
          {serverError}
        </div>
      )}

      {/* Username Field (Sign Up Only) */}
      {!isLogin && (
        <div className="form-group">
          <label>Username</label>
          <div className="input-icon-wrapper">
            <User className="input-icon" size={20} />
            <input
              type="text"
              placeholder="Display Name"
              {...register("username")}
              className={errors.username ? "input-error" : ""}
            />
          </div>
          {errors.username && <span className="field-error">{errors.username.message}</span>}
        </div>
      )}

      {/* Email Field */}
      <div className="form-group">
        <label>Email</label>
        <div className="input-icon-wrapper">
          <Mail className="input-icon" size={20} />
          <input
            type="email"
            placeholder="you@university.ie"
            {...register("email")}
            className={errors.email ? "input-error" : ""}
          />
        </div>
        {errors.email && <span className="field-error">{errors.email.message}</span>}
      </div>

      {/* Password Field */}
      <div className="form-group">
        <label>Password</label>
        <div className="input-icon-wrapper">
          <Lock className="input-icon" size={20} />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="••••••••"
            {...register("password")}
            className={errors.password ? "input-error" : ""}
          />
          <button
            type="button"
            className="password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {errors.password && <span className="field-error">{errors.password.message}</span>}
      </div>

      {isLogin && (
        <div className="form-options">
            <label className="checkbox-label">
                <input 
                    type="checkbox" 
                    checked={keepLoggedIn} 
                    onChange={(e) => setKeepLoggedIn(e.target.checked)} 
                />
                Keep me logged in
            </label>
            <button type="button" className="forgot-password" onClick={() => window.location.href='/reset-password'}>
                Forgot Password?
            </button>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="submit-btn"
        disabled={isLoading}
      >
        {isLoading ? "Processing..." : isLogin ? "Log In" : "Sign Up"}
      </motion.button>

      <div className="divider">
        <span>OR</span>
      </div>

      <button
        type="button"
        className="google-btn"
        onClick={handleGoogleSignIn}
        disabled={isLoading}
      >
        <img
          src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
          alt="Google"
        />
        <span>Continue with Google</span>
      </button>

      <p className="toggle-mode">
        {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
        <button type="button" onClick={toggleLoginMode}>
          {isLogin ? "Sign Up" : "Log In"}
        </button>
      </p>
    </form>
  );
};

export default SignUpForm;
