/**
 * Authentication translations: sign up, sign in, password, auth errors.
 */

export const authTranslations = {
  es: {
    auth: {
      signUp: {
        title: 'Crear Cuenta',
        subtitle:
          'Únete a la comunidad de egresados en ciencia de datos de la UNAM',
        firstName: 'Nombre',
        lastName: 'Apellido',
        email: 'Correo Electrónico',
        password: 'Contraseña',
        confirmPassword: 'Confirmar Contraseña',
        acceptTerms: 'Acepto los términos y condiciones',
        alreadyHaveAccount: '¿Ya tienes una cuenta?',
        signInHere: 'Inicia sesión aquí',
        orContinueWith: 'O continúa con',
        googleSignUp: 'Registrarse con Google',
        createAccount: 'Crear Cuenta',
        termsAndConditions: 'Términos y Condiciones',
        privacyPolicy: 'Política de Privacidad',
        button: 'Crear Cuenta',
        google: 'Registrarse con Google',
        haveAccount: '¿Ya tienes una cuenta?',
        signIn: 'Inicia sesión aquí',
      },
      signIn: {
        title: 'Iniciar Sesión',
        subtitle: 'Accede a tu cuenta de SECiD',
        email: 'Correo Electrónico',
        password: 'Contraseña',
        rememberMe: 'Recordarme',
        forgotPassword: '¿Olvidaste tu contraseña?',
        signIn: 'Iniciar Sesión',
        noAccount: '¿No tienes una cuenta?',
        signUpHere: 'Regístrate aquí',
        orContinueWith: 'O continúa con',
        googleSignIn: 'Iniciar sesión con Google',
        button: 'Iniciar Sesión',
      },
      action: {
        loading: 'Verificando tu enlace...',
        errorTitle: 'Este enlace no funciona',
        requestNew: 'Solicitar un correo nuevo',
        goToLogin: 'Ir a iniciar sesión',
        resetTitle: 'Restablece tu contraseña',
        resetSubtitle: 'Elige una contraseña nueva para la cuenta',
        newPassword: 'Contraseña nueva',
        confirmPassword: 'Confirmar contraseña',
        passwordHint: 'Mínimo 8 caracteres, una mayúscula y un número.',
        submit: 'Guardar contraseña nueva',
        resetSuccessTitle: 'Contraseña actualizada',
        resetSuccessBody: 'Ya puedes iniciar sesión con tu contraseña nueva.',
        verifySuccessTitle: 'Correo verificado',
        verifySuccessBody:
          'Tu correo electrónico quedó confirmado. Ya puedes iniciar sesión.',
        recoverSuccessTitle: 'Correo restaurado',
        recoverSuccessBody: 'Tu correo de acceso volvió a ser',
        recoverHint:
          'Si no solicitaste el cambio, restablece tu contraseña ahora mismo.',
        errors: {
          missing:
            'El enlace está incompleto o no es válido. Solicita un correo nuevo e inténtalo de nuevo.',
          passwordTooShort: 'La contraseña debe tener al menos 8 caracteres',
          passwordNeedsUppercase:
            'La contraseña debe incluir al menos una mayúscula',
          passwordNeedsNumber: 'La contraseña debe incluir al menos un número',
          passwordsMismatch: 'Las contraseñas no coinciden',
          generic: 'Algo salió mal. Inténtalo de nuevo.',
        },
      },
      or: 'o',
      acceptTerms: {
        prefix: 'Acepto los',
        link: 'términos y condiciones',
      },
      errors: {
        'auth/user-not-found': 'No existe una cuenta con este correo',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/invalid-credential':
          'Correo o contraseña incorrectos. Si te registraste con Google, usa ese botón o restablece tu contraseña.',
        'auth/email-already-in-use': 'Este correo ya está registrado',
        'auth/weak-password': 'La contraseña es muy débil',
        'auth/invalid-email': 'Correo electrónico inválido',
        'auth/operation-not-allowed': 'Operación no permitida',
        'auth/configuration-not-found':
          'El servicio de autenticación no está configurado. Contacta al administrador.',
        'auth/unauthorized-domain':
          'Este dominio no está autorizado para iniciar sesión. Contacta al administrador.',
        'auth/invalid-action-code':
          'Este enlace no es válido o ya fue utilizado. Solicita uno nuevo.',
        'auth/expired-action-code':
          'Este enlace ya expiró. Solicita uno nuevo.',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
        'auth/too-many-requests': 'Demasiados intentos. Inténtalo más tarde',
        'auth/network-request-failed':
          'Error de conexión. Verifica tu internet',
        default: 'Ha ocurrido un error',
      },
    },
  },
  en: {
    auth: {
      signUp: {
        title: 'Create Account',
        subtitle: 'Join the UNAM data science alumni community',
        firstName: 'First Name',
        lastName: 'Last Name',
        email: 'Email Address',
        password: 'Password',
        confirmPassword: 'Confirm Password',
        acceptTerms: 'I accept the terms and conditions',
        alreadyHaveAccount: 'Already have an account?',
        signInHere: 'Sign in here',
        orContinueWith: 'Or continue with',
        googleSignUp: 'Sign up with Google',
        createAccount: 'Create Account',
        termsAndConditions: 'Terms and Conditions',
        privacyPolicy: 'Privacy Policy',
        button: 'Create Account',
        google: 'Sign up with Google',
        haveAccount: 'Already have an account?',
        signIn: 'Sign in here',
      },
      signIn: {
        title: 'Sign In',
        subtitle: 'Access your SECiD account',
        email: 'Email Address',
        password: 'Password',
        rememberMe: 'Remember me',
        forgotPassword: 'Forgot your password?',
        signIn: 'Sign In',
        noAccount: "Don't have an account?",
        signUpHere: 'Sign up here',
        orContinueWith: 'Or continue with',
        googleSignIn: 'Sign in with Google',
        button: 'Sign In',
      },
      action: {
        loading: 'Checking your link...',
        errorTitle: 'This link does not work',
        requestNew: 'Request a new email',
        goToLogin: 'Go to sign in',
        resetTitle: 'Reset your password',
        resetSubtitle: 'Choose a new password for the account',
        newPassword: 'New password',
        confirmPassword: 'Confirm password',
        passwordHint:
          'At least 8 characters, one uppercase letter and one number.',
        submit: 'Save new password',
        resetSuccessTitle: 'Password updated',
        resetSuccessBody: 'You can now sign in with your new password.',
        verifySuccessTitle: 'Email verified',
        verifySuccessBody:
          'Your email address has been confirmed. You can now sign in.',
        recoverSuccessTitle: 'Email restored',
        recoverSuccessBody: 'Your sign-in email is back to',
        recoverHint:
          'If you did not request the change, reset your password right away.',
        errors: {
          missing:
            'The link is incomplete or not valid. Request a new email and try again.',
          passwordTooShort: 'Password must be at least 8 characters',
          passwordNeedsUppercase:
            'Password must contain at least one uppercase letter',
          passwordNeedsNumber: 'Password must contain at least one number',
          passwordsMismatch: 'Passwords do not match',
          generic: 'Something went wrong. Please try again.',
        },
      },
      or: 'or',
      acceptTerms: {
        prefix: 'I accept the',
        link: 'terms and conditions',
      },
      errors: {
        'auth/user-not-found': 'No account exists with this email',
        'auth/wrong-password': 'Incorrect password',
        'auth/invalid-credential':
          'Incorrect email or password. If you signed up with Google, use that button or reset your password.',
        'auth/email-already-in-use': 'This email is already registered',
        'auth/weak-password': 'Password is too weak',
        'auth/invalid-email': 'Invalid email address',
        'auth/operation-not-allowed': 'Operation not allowed',
        'auth/configuration-not-found':
          'Authentication service is not configured. Contact the administrator.',
        'auth/unauthorized-domain':
          'This domain is not authorized for sign-in. Contact the administrator.',
        'auth/invalid-action-code':
          'This link is invalid or has already been used. Request a new one.',
        'auth/expired-action-code': 'This link has expired. Request a new one.',
        'auth/user-disabled': 'This account has been disabled',
        'auth/too-many-requests': 'Too many attempts. Try again later',
        'auth/network-request-failed': 'Connection error. Check your internet',
        default: 'An error occurred',
      },
    },
  },
} as const;
