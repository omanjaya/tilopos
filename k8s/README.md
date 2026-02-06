# Kubernetes Deployment

This directory contains Kubernetes manifests for deploying TiloPOS.

## 🔒 Security & Secrets Management

### Local Development / Testing

1. **Copy the secrets template:**
   ```bash
   cp base/secrets.yaml.example base/secrets.yaml
   ```

2. **Edit `secrets.yaml` with your actual credentials:**
   ```bash
   # Use your preferred editor
   nano base/secrets.yaml
   # or
   vim base/secrets.yaml
   ```

3. **Generate strong secrets:**
   ```bash
   # JWT secrets (64 chars recommended)
   openssl rand -base64 64

   # Database password (32 chars recommended)
   openssl rand -base64 32
   ```

4. **⚠️ IMPORTANT**: Never commit `secrets.yaml` to git!
   - The file is already in `.gitignore`
   - Only commit `.example` files

### Production Deployment

**❌ DO NOT use plain secrets.yaml in production!**

Use proper secret management solutions:

#### Option 1: Sealed Secrets (Recommended for GitOps)

Install Sealed Secrets controller:
```bash
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml
```

Seal your secrets:
```bash
kubeseal --format=yaml < base/secrets.yaml > base/sealed-secrets.yaml
```

Now `sealed-secrets.yaml` is safe to commit to git.

#### Option 2: External Secrets Operator

Connect to external secret managers (Vault, AWS Secrets Manager, GCP Secret Manager):

```bash
# Install External Secrets Operator
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets
```

Create `ExternalSecret` resource (see example in `secrets.yaml.example`).

#### Option 3: Cloud Provider Secret Management

**AWS EKS:**
- Use AWS Secrets Manager
- Enable IRSA (IAM Roles for Service Accounts)

**GCP GKE:**
- Use Google Secret Manager
- Enable Workload Identity

**Azure AKS:**
- Use Azure Key Vault
- Enable Pod Identity

## 📁 Directory Structure

```
k8s/
├── base/                    # Base manifests
│   ├── deployment.yaml      # Application deployment
│   ├── service.yaml         # ClusterIP service
│   ├── configmap.yaml       # Non-sensitive configuration
│   ├── secrets.yaml.example # Template for secrets (copy to secrets.yaml)
│   └── sealed-secrets.yaml  # (if using Sealed Secrets)
│
├── overlays/
│   ├── development/         # Dev-specific configs
│   ├── staging/             # Staging-specific configs
│   └── production/          # Production-specific configs
│
└── README.md               # This file
```

## 🚀 Deployment

### Using kubectl

```bash
# Development
kubectl apply -k overlays/development

# Production
kubectl apply -k overlays/production
```

### Using Kustomize

```bash
# Build manifests
kustomize build overlays/production

# Deploy
kustomize build overlays/production | kubectl apply -f -
```

### Using Helm (Future)

Coming soon: Helm chart for easier deployment.

## 🔍 Verify Deployment

```bash
# Check pods
kubectl get pods -n tilopos

# Check services
kubectl get svc -n tilopos

# Check secrets
kubectl get secrets -n tilopos

# View logs
kubectl logs -f deployment/tilopos-backend -n tilopos
kubectl logs -f deployment/tilopos-web -n tilopos
```

## 🛡️ Security Checklist

Before deploying to production:

- [ ] All secrets are managed via proper secret management (not plain YAML)
- [ ] Database passwords are strong (32+ characters)
- [ ] JWT secrets are strong (64+ characters)
- [ ] Network policies are configured
- [ ] Resource limits are set
- [ ] RBAC is properly configured
- [ ] Ingress TLS/SSL is enabled
- [ ] Container images are scanned for vulnerabilities
- [ ] Pod Security Standards are enforced
- [ ] Monitoring and logging are configured

## 📚 Resources

- [Kubernetes Secrets](https://kubernetes.io/docs/concepts/configuration/secret/)
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
- [External Secrets Operator](https://external-secrets.io/)
- [Kubernetes Security Best Practices](https://kubernetes.io/docs/concepts/security/overview/)
