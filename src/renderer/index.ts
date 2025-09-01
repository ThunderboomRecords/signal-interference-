import './index.css';
import './app';
import { ElectonAPI } from '../preload';

declare global {
  interface Window {
    electronApi: ElectonAPI
  }
}


