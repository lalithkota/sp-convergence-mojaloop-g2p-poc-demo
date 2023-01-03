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

import { StateResponseToolkit } from '../plugins/state'
import { Request, ResponseObject } from '@hapi/hapi'
import { ValidationError } from '../../validation/validation-error'
import PaymentMultiplexer, { MojaloopPayabilityCheckRequest } from '../../../pil-payment-multiplexer'
import Config from '../../lib/config'
// import DirectoryMultiplexer from '../../../pil-directory-multiplexer'

interface PayeeItem {
  payeeIdType: string;
  payeeIdValue: string;
  amount: string;
  currency: string;
}
interface DisbursementCheckRequest {
  note: string;
  payeeList: PayeeItem[];
}

interface PayeeResultItem extends PayeeItem {
  isPayable: Boolean;
  timestamp: string;
  name?: string | undefined;
  dateOfBirth?: string | undefined;
  errors?: string[];
}

interface DisbursementCheckResult {
  payeeResults: PayeeResultItem[];
}

const disbursementCheck = async (
  _context: unknown,
  _request: Request,
  h: StateResponseToolkit
): Promise<ResponseObject> => {
  try {
    const paymentExecutionSystem = Config.PAYMENT_EXECUTION_METHOD
    const payerDfspId = Config.PAYER_DFSP_ID
    const payerIdType = Config.PAYER_ID_TYPE
    const payerIdValue = Config.PAYER_ID_VALUE

    if((!paymentExecutionSystem) && (!payerDfspId) && (!payerIdType) && (!payerIdValue)){
      console.error(`Unable to find required variables in config, PAYMENT_EXECUTION_METHOD, PAYER_DFSP_ID, PAYER_ID_TYPE, PAYER_ID_VALUE`)
      process.exit(1)
    }

    const payeeResults: PayeeResultItem[] = []
    const disbursementRequest = _request.payload as DisbursementCheckRequest
    for await (const payeeItem of disbursementRequest.payeeList) {
      try {
        switch(paymentExecutionSystem) {
          case 'MOJALOOP': {
            const payabilityCheckRequest : MojaloopPayabilityCheckRequest = {
              payerDfspId: payerDfspId,
              payerIdType: payerIdType,
              payerIdValue: payerIdValue,
              payeeIdType: payeeItem.payeeIdType,
              payeeIdValue: payeeItem.payeeIdValue
            }
            const mojaloopResponse = await PaymentMultiplexer.checkPayability(payabilityCheckRequest)
            const disbursementCheckResponseItem = {
              payeeInformation: mojaloopResponse.partyResponse,
              error: mojaloopResponse.error
            }
            payeeResults.push({
              ...payeeItem,
              isPayable: mojaloopResponse.isPayable,
              timestamp: new Date().toISOString(),
              name: mojaloopResponse.partyResponse?.name,
              dateOfBirth: mojaloopResponse.partyResponse?.personalInfo?.dateOfBirth,
            })
            break;
          }
          default: {
            throw(new Error(`Unsupported payment execution system ${paymentExecutionSystem}`))
          }
        }
      } catch (err: any) {
        if (err instanceof ValidationError) {
          payeeResults.push({
            ...payeeItem,
            isPayable: false,
            timestamp: new Date().toISOString(),
            errors: err.validationErrors
          })
        } else {
          payeeResults.push({
            ...payeeItem,
            isPayable: false,
            timestamp: new Date().toISOString(),
            errors: [ err.message ]
          })
        }
      }
    }
    return h.response({ payeeResults }).code(200)
  } catch (e) {
    h.getLogger().error(e)
    return h.response().code(500)
  }
}

export default {
  disbursementCheck
}
