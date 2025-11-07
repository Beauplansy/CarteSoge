import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../common/Layout';

const ChangePassword = () => {
  const [passwords, setPasswords] = useState({
    old_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user, requiresAction } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const message = location.state?.message;

  const handleChange = (e) => {
    setPasswords({
      ...passwords,
      [e.target.name]: e.target.value,
    });
    // Effacer les messages quand l'utilisateur tape
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validatePassword = (password) => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      return 'Le mot de passe doit contenir au moins 8 caractères';
    }
    if (!hasUpperCase) {
      return 'Le mot de passe doit contenir au moins une majuscule';
    }
    if (!hasLowerCase) {
      return 'Le mot de passe doit contenir au moins une minuscule';
    }
    if (!hasNumbers) {
      return 'Le mot de passe doit contenir au moins un chiffre';
    }
    if (!hasSpecialChar) {
      return 'Le mot de passe doit contenir au moins un caractère spécial';
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validation des mots de passe
    if (passwords.new_password !== passwords.confirm_password) {
      setError('Les nouveaux mots de passe ne correspondent pas');
      setLoading(false);
      return;
    }

    const passwordError = validatePassword(passwords.new_password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    // Pour la première connexion, on utilise le mot de passe temporaire comme ancien mot de passe
    // Si l'utilisateur ne remplit pas old_password, on utilise une valeur par défaut
    const submitData = { ...passwords };
    
    if (user?.first_login && !submitData.old_password) {
      // Si c'est la première connexion et que old_password est vide,
      // on pourrait utiliser un mot de passe par défaut ou modifier le backend
      // Pour l'instant, on laisse vide et le backend devra gérer ce cas
      console.log('🆕 Première connexion - ancien mot de passe non requis');
    }

    try {
      const { authAPI } = await import('../../services/api');
      console.log('📤 Données envoyées:', submitData);
      
      await authAPI.changePassword(submitData);
      
      setSuccess('✅ Mot de passe changé avec succès!');
      
      // Redirection après succès
      setTimeout(() => {
        if (requiresAction.updateProfile) {
          navigate('/profile', { 
            state: { message: 'Veuillez compléter votre profil' }
          });
        } else {
          navigate('/dashboard', { 
            state: { message: 'Mot de passe changé avec succès' }
          });
        }
      }, 2000);
      
    } catch (error) {
      console.error('❌ Erreur changement mot de passe:', error);
      console.error('📊 Détails erreur:', error.response?.data);
      
      // Gestion spécifique des erreurs
      if (error.response?.data?.old_password) {
        setError(`Ancien mot de passe: ${error.response.data.old_password}`);
      } else if (error.response?.data?.new_password) {
        setError(`Nouveau mot de passe: ${Array.isArray(error.response.data.new_password) 
          ? error.response.data.new_password.join(', ') 
          : error.response.data.new_password}`);
      } else if (error.response?.data?.confirm_password) {
        setError(`Confirmation: ${error.response.data.confirm_password}`);
      } else if (error.response?.data?.error) {
        setError(error.response.data.error);
      } else {
        setError('Erreur lors du changement de mot de passe');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card">
              <div className="card-header bg-primary text-white">
                <h4 className="mb-0">🔒 Changement de Mot de Passe</h4>
              </div>
              <div className="card-body">
                {message && (
                  <div className="alert alert-info">
                    {message}
                  </div>
                )}

                {user?.first_login && (
                  <div className="alert alert-warning">
                    <strong>⚠️ Première connexion</strong><br />
                    Pour des raisons de sécurité, vous devez changer votre mot de passe temporaire.
                    {!passwords.old_password && (
                      <div className="mt-2 small">
                        💡 <strong>Note :</strong> Utilisez votre mot de passe temporaire comme "mot de passe actuel"
                      </div>
                    )}
                  </div>
                )}

                {error && (
                  <div className="alert alert-danger">
                    ❌ {error}
                  </div>
                )}

                {success && (
                  <div className="alert alert-success">
                    ✅ {success}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  {/* TOUJOURS afficher le champ ancien mot de passe */}
                  <div className="mb-3">
                    <label htmlFor="old_password" className="form-label">
                      {user?.first_login ? '🔑 Mot de passe temporaire' : '🔑 Mot de passe actuel'}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="old_password"
                      name="old_password"
                      value={passwords.old_password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      placeholder={
                        user?.first_login 
                          ? "Entrez votre mot de passe temporaire" 
                          : "Entrez votre mot de passe actuel"
                      }
                    />
                    {user?.first_login && (
                      <div className="form-text text-warning">
                        ⚠️ Pour la première connexion, utilisez le mot de passe temporaire qui vous a été fourni.
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label htmlFor="new_password" className="form-label">
                      🆕 Nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="new_password"
                      name="new_password"
                      value={passwords.new_password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      placeholder="Entrez votre nouveau mot de passe"
                      minLength={8}
                    />
                    <div className="form-text">
                      Le mot de passe doit contenir au moins:
                      <ul className="small">
                        <li>8 caractères</li>
                        <li>1 majuscule et 1 minuscule</li>
                        <li>1 chiffre</li>
                        <li>1 caractère spécial</li>
                      </ul>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="confirm_password" className="form-label">
                      ✅ Confirmer le nouveau mot de passe
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="confirm_password"
                      name="confirm_password"
                      value={passwords.confirm_password}
                      onChange={handleChange}
                      required
                      disabled={loading}
                      placeholder="Confirmez votre nouveau mot de passe"
                    />
                  </div>

                  <div className="d-grid gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" />
                          Modification...
                        </>
                      ) : (
                        '🔒 Changer le mot de passe'
                      )}
                    </button>
                    
                    {!user?.first_login && (
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => navigate('/dashboard')}
                        disabled={loading}
                      >
                        ↩️ Retour au tableau de bord
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChangePassword;