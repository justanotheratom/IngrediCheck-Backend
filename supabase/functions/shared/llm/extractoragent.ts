import { Context } from "https://deno.land/x/oak@v12.6.0/mod.ts"
import * as DB from '../db.ts'
import * as GenericAgent from './genericagent.ts'

export async function extractorAgent(
    ctx: Context,
    productImagesOCR: string[])
    : Promise<DB.Product>
{
    let extractedProduct = DB.defaultProduct()

    async function record_product_details(parameters: { product: DB.Product }): Promise<[any, boolean]> {
        extractedProduct = parameters.product
        return [parameters.product, false]
    }

    const functionObject = {
        record_product_details: record_product_details
    }

    const agentFunctions: GenericAgent.ChatFunction[] = [
        {
            name: 'record_product_details',
            description: 'Record the product details',
            parameters: {
                type: 'object',
                properties: {
                    product: {
                        type: 'object',
                        properties: {
                            barcode: { type: 'string' },
                            brand: { type: 'string' },
                            name: { type: 'string' },
                            ingredients: {
                                type: 'array',
                                items: {
                                    type: 'object',
                                    properties: {
                                        name: { type: 'string' },
                                        ingredients: {
                                            type: 'array',
                                            items: {
                                                type: 'object',
                                                properties: {
                                                    name: { type: 'string' },
                                                },
                                                required: ['name']
                                            }
                                        }
                                    },
                                    required: ['name']
                                }
                            }
                        },
                        required: ['ingredients']
                    }
                },
                required: ['product']
            }
        }
    ]

    const systemMessage = `
        You are an expert in reading OCR text of food product images. You specialize 
        in extracting barcode, name, brand, and list of ingredients from the OCR text
        of food product images.
    `

    const userMessage = productImagesOCR.join('\n---------------\n')

    const messages: GenericAgent.ChatMessage[] = [
        {
            role: 'system',
            content: systemMessage
        },
        {
            role: 'user',
            content: userMessage
        }
    ]

    const _ = await GenericAgent.genericAgent(
        ctx,
        'extractoragent',
        messages,
        agentFunctions,
        GenericAgent.ModelName.GPT4turbo,
        functionObject,
        crypto.randomUUID(),
        []
    )

    return extractedProduct
}