# Guide de Déploiement du Système d'Audit
## SOGEAPP CREDIT - Système d'Audit Global

### 📋 Étapes à Suivre

#### 1. **Créer et Appliquer les Migrations Django**

Ouvrez un terminal dans le dossier `backend` et exécutez:

```bash
# Activer l'environnement virtuel Python (si nécessaire)
venv\Scripts\activate

# Créer la migration pour le modèle AuditLog
python manage.py makemigrations

# Appliquer la migration à la base de données
python manage.py migrate
```

#### 2. **Enregistrer le ViewSet AuditLog dans les URLs**

Vérifiez que le fichier `backend/authentication/urls.py` contient:

```python
# Dans le router registration:
router.register(r'audit_logs', AuditLogViewSet, basename='audit_logs')
```

#### 3. **Démarrer le Serveur Backend**

```bash
python manage.py runserver
```

#### 4. **Démarrer le Serveur Frontend** (dans un autre terminal)

```bash
# Depuis le dossier frontend
npm run dev
```

### 🎯 Fonctionnalités Implémentées

#### **Backend (Django)**

1. ✅ **Modèle AuditLog** (`authentication/models.py`)
   - Trace toutes les actions du système
   - Enregistre: utilisateur, IP, type d'action, ressource, changements
   - Timestamps automatiques avec index pour requêtes rapides

2. ✅ **Utilitaires d'Audit** (`authentication/audit_utils.py`)
   - Fonctions helpers pour enregistrer les logs
   - `log_audit()` - enregistrement générique
   - `log_login_audit()` - traçage des connexions
   - `log_login_failed_audit()` - tentatives échouées
   - Extraction automatique IP et User-Agent

3. ✅ **ViewSet API** (`authentication/views.py::AuditLogViewSet`)
   - Endpoint `GET /auth/audit_logs/` - lister tous les logs
   - Filtrage par user, action, resource_type, status
   - Endpoint `/audit_logs/recent/` - activités dernières 24h
   - Endpoint `/audit_logs/stats/` - statistiques audit

4. ✅ **Intégration au Login**
   - Chaque connexion réussie est enregistrée
   - Tentatives échouées sont tracées

#### **Frontend (React)**

1. ✅ **Page AuditLog** (`frontend/src/components/admin/AuditLog.jsx`)
   - Vue complète pour le manager
   - Filtres: utilisateur, action, type ressource, statut
   - Tableau des logs avec détails
   - Statistiques: total, aujourd'hui, 7 jours, échecs
   - Dialog pour voir les changements en JSON

2. ✅ **Intégration Layout**
   - Lien "Audit" ajouté au menu latéral (managers uniquement)
   - Route protégée `/admin/audit`

3. ✅ **Routes App.jsx**
   - Route `/admin/audit` protégée avec permission manager

### 🔐 Permissions & Sécurité

- **Managers seuls** peuvent accéder à `GET /auth/audit_logs/`
- **Logs non-modifiables** (read-only pour tous)
- **Isolation des données** - managers voient tous les logs, autres voir leurs propres logs
- **IP tracking** - capture automatique pour traçabilité

### 📊 Actions Tracées

| Action | Code | Type Ressource |
|--------|------|---|
| Connexion | `login` | User |
| Déconnexion | `logout` | User |
| Création Dossier | `create_app` | CreditApplication |
| Modification Dossier | `update_app` | CreditApplication |
| Suppression Dossier | `delete_app` | CreditApplication |
| Assignation Officier | `assign_officer` | CreditApplication |
| Génération Rapport | `generate_report` | Report |
| Export Données | `export_data` | Report |
| Création Utilisateur | `create_user` | User |
| Modification Utilisateur | `update_user` | User |
| Suppression Utilisateur | `delete_user` | User |

### 🚀 Améliorations Futures Recommandées

1. **Enrichir l'audit dans plus de vues**
   - Ajouter audit pour: creation app, modification app, modification utilisateur
   - Enregistrer les changements détaillés (avant/après)

2. **Alertes Email**
   - Notifier les managers sur actions critiques
   - Détection anomalies (multiples tentatives échouées, etc)

3. **Export Audit**
   - Télécharger logs en PDF/CSV
   - Filtrage avancé avec dates

4. **Signatures Digitales**
   - Signer les logs d'audit pour immuabilité
   - Conformité légale

5. **Archivage**
   - Archiver les logs anciens (> 6 mois)
   - Optimiser les performances BD

### 🔍 Test Manuel

1. **Tester la Connexion**
   ```
   1. Ouvrir http://localhost:5173/login
   2. Se connecter avec un compte manager
   3. Vérifier dans /admin/audit - vous devriez voir votre connexion tracée
   ```

2. **Tester la Page Audit**
   ```
   1. Naviguer vers Admin > Audit
   2. Vous devriez voir un tableau avec vos actions
   3. Essayer les filtres (utilisateur, action, statut)
   4. Vérifier les statistiques en haut
   ```

3. **Tester les Logs**
   ```
   1. Effectuer différentes actions (créer dossier, modifier, etc)
   2. Rafraîchir la page Audit
   3. Vérifier que les actions apparaissent immédiatement
   ```

### 📝 Structure des Données

#### **AuditLog Model**
```python
{
  'id': 1,
  'user': 1,                           # FK User
  'user_name': 'Jean Dupont',
  'action': 'login',                   # Type d'action
  'action_display': 'Connexion',
  'resource_type': 'User',
  'resource_id': '1',
  'resource_display': 'Jean Dupont',
  'ip_address': '192.168.1.100',
  'user_agent': 'Mozilla/5.0...',
  'changes': {},                        # JSON des changements
  'status': 'success',                  # success | failed
  'status_display': 'Succès',
  'error_message': '',
  'timestamp': '2026-01-07T14:30:00Z'
}
```

### ⚙️ Configuration (settings.py déjà configurée)

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'file': {
            'level': 'DEBUG',
            'class': 'logging.FileHandler',
            'filename': os.path.join(BASE_DIR, 'debug.log'),
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}
```

### 📞 Support

Si vous rencontrez des erreurs:

1. **Migration échoue**: Vérifiez que la migration n'existe pas déjà
   ```bash
   python manage.py showmigrations authentication
   ```

2. **API non trouvée**: Vérifiez que le router est enregistré dans `urls.py`

3. **Permission refusée**: Vérifiez que vous êtes connecté en tant que manager

---

**Système d'audit prêt au déploiement! 🎉**
