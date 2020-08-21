import * as core from '@actions/core';
import { createAppAuth } from '@octokit/auth-app';
import { request } from '@octokit/request';

const getId = (): number => {
  const appId = core.getInput('app-id', { required: true });
  return parseInt(appId);
}

const getPrivateKey = (): string => {
  const appPK = core.getInput('app-pk', { required: true });
  return [
    '-----BEGIN RSA PRIVATE KEY-----',
    ...(
      appPK
        .replace(/(-----.+?-----)|\s/g, '')
        .match(/.{1,64}/g) || []
    ),
    '-----END RSA PRIVATE KEY-----'
  ].join('\n');
}

const getInstallationId = async (id: number, privateKey: string): Promise<number> => {
  const instlId = core.getInput('instl-id', { required: false });

  const installationId = parseInt(instlId);
  if (!isNaN(installationId)) 
    return installationId;

  const auth = createAppAuth({
    id,
    privateKey,
  });
  
  const { data: installations } = await auth.hook(
    request,
    'GET /app/installations',
  );
  
  const length = (installations || []).length;
  if (length != 1)
    throw new Error(`Unable to infer default installation`);
  
  return installations[0].id;
}

const run = async (): Promise<void> => {
  try {
    const id = getId();
    const privateKey = getPrivateKey();
    const installationId =  await getInstallationId(id, privateKey);

    const auth = createAppAuth({
      id,
      privateKey,
      installationId,
    });

    const installationAuthentication = await auth({
      type: 'installation',
    });

    core.setOutput('instl-token', installationAuthentication.token);
  } catch (error) {
    core.setFailed(error.message);
  }
}

run();

export default run;
