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
import PaymentMultiplexer, { MojaloopSendMoneyRequest } from '../../../pil-payment-multiplexer'
// import DirectoryMultiplexer from '../../../pil-directory-multiplexer'
import { ObjectStore } from '../../lib/obj-store'
import Config from '../../lib/config'

interface PayeeItem {
  payeeIdType: string;
  payeeIdValue: string;
  amount: string;
  currency: string;
}
interface DisbursementRequest {
  disbursementId: string;
  note: string;
  payeeList: PayeeItem[];
}

interface PayeeResultItem extends PayeeItem {
  timestamp: string;
  status: string;
  amountDebited?: string | undefined;
  amountCredited?: string | undefined;
  errors?: string[];
}
interface DisbursementResult {
  disbursementId: string;
  payeeResults: PayeeResultItem[];
}

const postDisbursement = async (
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
    const disbursementRequest = _request.payload as DisbursementRequest
    console.log(`Here is json payload ${JSON.stringify(_request.payload)}`)
    for await (const payeeItem of disbursementRequest.payeeList) {
      try {
        switch(paymentExecutionSystem) {
          case 'MOJALOOP': {
            const sendMoneyRequest : MojaloopSendMoneyRequest = {
              payerDfspId,
              payerIdType,
              payerIdValue,
              payeeIdType: payeeItem.payeeIdType,
              payeeIdValue: payeeItem.payeeIdValue,
              amount: payeeItem.amount,
              currency: payeeItem.currency
            }
            const mojaloopResponse = await PaymentMultiplexer.sendMoney(sendMoneyRequest)
            const disbursementResponseItem = {
              payeeInformation: mojaloopResponse.payeeInformation,
              transferId: mojaloopResponse.transferId,
              currentState: mojaloopResponse.currentState,
              initiatedTimestamp: mojaloopResponse.initiatedTimestamp,
              completedTimestamp: mojaloopResponse.completedTimestamp,
              payeeFspCommission: mojaloopResponse.payeeFspCommission,
              payeeFspFee: mojaloopResponse.payeeFspFee,
              payeeReceiveAmount: mojaloopResponse.payeeReceiveAmount
            }
            payeeResults.push({
              ...payeeItem,
              timestamp: new Date().toISOString(),
              status: mojaloopResponse.currentState,
              // TODO: The following fields are optional
              // Usually, these fields are based on payment execution system response
              // For Poc, we are just passing the amount from the request
              amountDebited: payeeItem.amount,
              amountCredited: payeeItem.amount
            })
            break;
          }
          default: {
            throw(new Error(`Unsupported payment execution system ${paymentExecutionSystem}`))
          }
        }
      } catch (err: any) {
        console.log(err.message)
        if (err instanceof ValidationError) {
          payeeResults.push({
            ...payeeItem,
            timestamp: new Date().toISOString(),
            status: 'ABORTED',
            errors: err.validationErrors
          })
        } else {
          payeeResults.push({
            ...payeeItem,
            timestamp: new Date().toISOString(),
            status: 'ABORTED',
            errors: [ err.message ]
          })
        }
      }
    }
    const obj = ObjectStore.getInstance()
    const resp: DisbursementResult = {
      disbursementId: disbursementRequest.disbursementId,
      payeeResults
    }
    obj.data[disbursementRequest.disbursementId] = resp
    return h.response(resp).code(200)
  } catch (e) {
    h.getLogger().error(e)
    return h.response().code(500)
  }
}

export default {
  postDisbursement
}
