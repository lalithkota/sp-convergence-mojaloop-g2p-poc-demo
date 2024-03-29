// Copyright 2022 Digital Convergence Initiative
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
// 
//     http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import rc from 'rc'
import parse from 'parse-strings-in-object'
import Config from '../../../config/pil-api-adapter.json'
import Package from '../../../package.json'
export interface ServiceConfig {
  // package.json
  PACKAGE: Record<string, unknown>;
  // API Server
  LISTEN_PORT: number;
  HOST: string;
  CORS_WHITELIST: string[];
  ALLOW_CREDENTIALS: boolean;
  PAYMENT_EXECUTION_METHOD: string;
  PAYER_DFSP_ID: string;
  PAYER_ID_TYPE: string;
  PAYER_ID_VALUE: string;
}

const RC = parse(rc('PIL_API_ADAPTER', Config)) as ServiceConfig

export default {
  ...RC,
  PACKAGE: Package
}
