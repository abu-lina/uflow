# Manual Production Deployment (GitHub Free Tier)

This guide explains how production deployments work with manual confirmation on GitHub Free tier.

## How It Works

Production deployments are **always manual** and require you to type `deploy` to confirm. This works on GitHub Free tier with private repositories (no environment protection rules needed).

## Deployment Flow

```
Push to main
    ↓
UAT deploys automatically ✅
    ↓
You review UAT at https://uat.ummahflow.com
    ↓
You manually trigger Production deployment
    ↓
Type "deploy" to confirm
    ↓
Production deploys ✅
```

## How to Deploy to Production

### Step 1: Wait for UAT to Complete

After pushing to `main`:
1. Go to **Actions** tab
2. Wait for "Deploy to UAT" workflow to complete
3. Check UAT is working: https://uat.ummahflow.com

### Step 2: Manually Trigger Production

1. Go to **Actions** tab
2. Select **"Deploy to Production"** workflow (left sidebar)
3. Click **"Run workflow"** button (top right)
4. In the input field that appears, type: `deploy`
5. Click **"Run workflow"** to start

### Step 3: Monitor Deployment

1. The workflow will start running
2. Watch the logs in real-time
3. Wait for "✅ Production Deployment Successful!" message

## Confirmation Input

The workflow requires you to type `deploy` exactly (case-sensitive) to proceed. This prevents accidental deployments.

**Valid**: `deploy`  
**Invalid**: `Deploy`, `DEPLOY`, `deploy!`, or anything else

## Why Manual Only?

- **GitHub Free tier**: Environment protection rules with required reviewers are only available for public repos or GitHub Enterprise
- **Safety**: Manual confirmation prevents accidental production deployments
- **Control**: You decide when to deploy after reviewing UAT
- **Simple**: No complex setup required

## Troubleshooting

### "Deployment not confirmed" Error

If you see this error:
- You didn't type `deploy` exactly
- Check the workflow logs to see what was received
- Make sure it's lowercase: `deploy`

### Production Deployment Not Starting

1. **Check confirmation**: Did you type `deploy` in the input field?
2. **Check workflow dispatch**: Did you click "Run workflow" after entering the confirmation?
3. **Check logs**: Look at the "Verify deployment confirmation" step

### Can't Find "Run workflow" Button

1. Make sure you're on the **Actions** tab
2. Select **"Deploy to Production"** workflow from the left sidebar
3. The "Run workflow" button is in the top right of the workflow page

## Best Practices

1. **Always test UAT first**: Let UAT deploy automatically and test it
2. **Review thoroughly**: Check UAT at https://uat.ummahflow.com before deploying to production
3. **Use confirmation**: The `deploy` confirmation prevents mistakes
4. **Monitor deployment**: Watch the workflow logs during deployment
5. **Check health**: Verify production at https://ummahflow.com/api/health after deployment

## Workflow Summary

- **UAT**: Automatic on push to `main`
- **Production**: Manual only, requires typing `deploy` to confirm
- **Works on**: GitHub Free tier with private repositories
- **No setup required**: Just use the workflow dispatch button

Your deployment pipeline is now:
- ✅ UAT-first (automatic)
- ✅ Production requires manual confirmation (safe)
- ✅ Works on GitHub Free tier
