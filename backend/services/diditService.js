import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

const DIDIT_BASE_URL = process.env.DIDIT_BASE_URL || 'https://verification.didit.me';
const DIDIT_API_KEY = process.env.DIDIT_API_KEY;
const DIDIT_WORKFLOW_ID = process.env.DIDIT_WORKFLOW_ID;

const normalizeName = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const isApproved = (value) => ['approved', 'success', 'completed', 'pass', 'passed'].includes(String(value || '').toLowerCase());
const isDeclined = (value) => ['declined', 'failed', 'rejected', 'error', 'fail'].includes(String(value || '').toLowerCase());

const appendFile = (form, field, file) => {
  if (file?.path) form.append(field, fs.createReadStream(file.path), file.originalname);
};

const diditRequest = async (path, form) => {
  try {
    const response = await axios.post(`${DIDIT_BASE_URL}${path}`, form, {
      headers: { 'x-api-key': DIDIT_API_KEY, ...form.getHeaders() },
      timeout: 45000,
      maxContentLength: 15 * 1024 * 1024,
      maxBodyLength: 15 * 1024 * 1024
    });
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.response?.data?.message || error.response?.data?.error;
    throw new Error(`Didit ${path} failed${status ? ` (${status})` : ''}${detail ? `: ${detail}` : ''}`);
  }
};

export const createDiditSession = async ({ userId, callbackUrl }) => {
  if (!DIDIT_API_KEY || !DIDIT_WORKFLOW_ID) throw new Error('Didit API key or workflow ID is not configured');
  try {
    const response = await axios.post(`${DIDIT_BASE_URL}/v3/session/`, {
      workflow_id: DIDIT_WORKFLOW_ID,
      vendor_data: `farmer-${userId}`,
      callback: callbackUrl
    }, { headers: { 'x-api-key': DIDIT_API_KEY, 'Content-Type': 'application/json' }, timeout: 20000 });
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.response?.data?.message || error.response?.data?.error;
    throw new Error(`Didit session creation failed${status ? ` (${status})` : ''}${detail ? `: ${detail}` : ''}`);
  }
};

export const getDiditDecision = async (sessionId) => {
  if (!DIDIT_API_KEY) throw new Error('Didit API key is not configured');
  try {
    const response = await axios.get(`${DIDIT_BASE_URL}/v3/session/${encodeURIComponent(sessionId)}/decision/`, {
      headers: { 'x-api-key': DIDIT_API_KEY }, timeout: 20000
    });
    return response.data;
  } catch (error) {
    const status = error.response?.status;
    const detail = error.response?.data?.detail || error.response?.data?.message || error.response?.data?.error;
    throw new Error(`Didit decision lookup failed${status ? ` (${status})` : ''}${detail ? `: ${detail}` : ''}`);
  }
};

export const verifyFarmerIdentity = async ({ user, cardFrontFile, cardBackFile, selfieFile }) => {
  if (!DIDIT_API_KEY) return { configured: false, status: 'manual_review' };
  if (!cardFrontFile || !cardBackFile || !selfieFile) {
    throw new Error('Front card, back card, and selfie images are required for identity verification');
  }

  const idForm = new FormData();
  appendFile(idForm, 'front_image', cardFrontFile);
  appendFile(idForm, 'back_image', cardBackFile);
  const idResult = await diditRequest('/v3/id-verification/', idForm);
  const idData = idResult.id_verification || {};
  const expectedName = normalizeName([user.first_name, user.other_names, user.surname].filter(Boolean).join(' ') || user.name);
  const documentName = normalizeName([idData.first_name, idData.last_name, idData.other_names].filter(Boolean).join(' '));
  const nameMatches = Boolean(expectedName && documentName && (documentName.includes(expectedName) || expectedName.includes(documentName)));
  if (isDeclined(idData.status) || !nameMatches) {
    return { configured: true, status: 'declined', requestId: idResult.request_id, result: { id: idResult, nameMatches } };
  }

  const livenessForm = new FormData();
  appendFile(livenessForm, 'user_image', selfieFile);
  const livenessResult = await diditRequest('/v3/passive-liveness/', livenessForm);
  const livenessData = livenessResult.passive_liveness || {};
  if (isDeclined(livenessData.status)) {
    return { configured: true, status: 'declined', requestId: livenessResult.request_id || idResult.request_id, result: { id: idResult, liveness: livenessResult, nameMatches } };
  }

  const searchForm = new FormData();
  appendFile(searchForm, 'user_image', selfieFile);
  const searchResult = await diditRequest('/v3/face-search/', searchForm);
  const searchData = searchResult.face_search || {};
  const duplicateMatches = Number(searchData.total_matches || 0);
  if (duplicateMatches > 0) {
    return { configured: true, status: 'duplicate', requestId: searchResult.request_id || idResult.request_id, result: { id: idResult, liveness: livenessResult, faceSearch: searchResult, nameMatches } };
  }

  const identityApproved = isApproved(idData.status) || Boolean(nameMatches);
  const livenessApproved = isApproved(livenessData.status) || Number(livenessData.score || 0) >= 0.5;
  return {
    configured: true,
    status: identityApproved && livenessApproved ? 'approved' : 'manual_review',
    requestId: idResult.request_id || livenessResult.request_id,
    result: { id: idResult, liveness: livenessResult, faceSearch: searchResult, nameMatches }
  };
};
