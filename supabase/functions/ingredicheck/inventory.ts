import { Context } from 'https://deno.land/x/oak@v12.6.0/mod.ts'

export async function get(ctx: Context, barcode: string, clientActivityId: string | null) {
    const url = `https://world.openfoodfacts.org/api/v3/product/${barcode}.json`
    const response = await fetch(url)
    const data = await response.json()

    let brand: string | undefined = undefined
    let name: string | undefined = undefined
    let ingredients: any[] = []

    let result_json: any = {}
    let log_json: any = {
        barcode: barcode,
        data_source: 'openfoodfacts/v3',
        client_activity_id: clientActivityId,
    }

    if (data.status === 'failure') {
        console.log(`Unexpected product details: ${JSON.stringify(data, null, 2)}`)
        ctx.response.status = 404
    } else {
        // console.log(`brand: ${data.product.brand_owner}`)
        // console.log(`name: ${data.product.product_name}`)
        // console.log(`ingredients: ${data.product.ingredients}`)
        // console.log(`images: ${data.product.selected_images?.front?.display?.en}`)

        if (data.product.brand_owner) {
            brand = data.product.brand_owner
        }

        if (data.product.product_name) {
            name = data.product.product_name
        }

        if (data.product.ingredients) {
            ingredients =
                data.product.ingredients.map((i: any) => {
                    return {
                        name: i.text,
                        vegan: i.vegan,
                        vegetarian: i.vegetarian,
                        ingredients: i.ingredients?.map((i2: any) => {
                            return {
                                name: i2.text,
                                vegan: i2.vegan,
                                vegetarian: i2.vegetarian,
                                ingredients: i2.ingredients?.map((i3: any) => {
                                    return {
                                        name: i3.text,
                                        vegan: i3.vegan,
                                        vegetarian: i3.vegetarian,
                                        ingredients: []
                                    }
                                }) ?? []
                            }
                        }) ?? []
                    }
                })
        }

        const images = extractDisplayImageUrls(data.product.selected_images)

        // Workaround for known issues with OpenFoodFacts data
        if (log_json.data_source === 'openfoodfacts/v3') {
            if (barcode === '0096619362776') {
                // Label says 'Contains No Animal Rennet', but ingredient list has 'Animal Rennet'.
                ingredients = ingredients.filter((i) => i.name !== 'Animal Rennet')
            }
        }

        result_json = {
            brand: brand,
            name: name,
            ingredients: ingredients,
            images: images
        }

        log_json = {
            ...log_json,
            brand: brand,
            name: name,
            ingredients: ingredients,
            images: images
        }

        ctx.response.status = 200
    }

    await ctx.state.supabaseClient.functions.invoke('background/log_inventory', {
        body: log_json,
        method: 'POST'
    })

    ctx.response.body = result_json
}

type SelectedImages = {
    [key: string]: {
        display: {
            [key: string]: string
        }
    }
}

type ImageUrl = {
    url: string
}

function extractDisplayImageUrls(selectedImages?: SelectedImages): ImageUrl[] {
    if (selectedImages) {
        return Object.values(selectedImages).flatMap(image => {
            if (image.display?.en) {
                return [{
                    url: image.display.en
                }]
            }
            return []
        })
    }
    return []
}
