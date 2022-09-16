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

import { StateResponseToolkit } from '~/server/plugins/state'
import { Request, ResponseObject } from '@hapi/hapi'
import { ValidationError } from '../../validation/validation-error'
import MojaloopUtils from '../../lib/mojaloop-utils'
import { MojaloopSendMoneyRequest } from '../../lib/mojaloop-utils'
import MapUtils from '../../lib/map-utils'
import { ObjectStore } from '../../lib/obj-store'

interface PayeeItem {
  payeeIdType: string;
  payeeIdValue: string;
  amount: string;
  currency: string;
}

interface PayeeResultItem extends PayeeItem {
  isSuccess: Boolean;
  paymentExecutionSystem?: string | undefined;
  paymentExecutionSystemInfo?: any | undefined;
  result: any;
}
interface DisbursementResult {
  payeeResults: PayeeResultItem[];
}

const getDisbursement = async (
  _context: unknown,
  _request: Request,
  h: StateResponseToolkit
): Promise<ResponseObject> => {
  try {
    const obj = ObjectStore.getInstance()
    return h.response(obj.data[_request.params.disbursementId]).code(200)
  } catch (e) {
    h.getLogger().error(e)
    return h.response().code(500)
  }
}

export default {
  getDisbursement
}
