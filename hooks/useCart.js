'use client'

import { useState, useEffect } from 'react'

export default function useCart() {

  const [cart, setCart] = useState([])

  useEffect(() => {

    try {

      const saved = localStorage.getItem('tenova10_cart')

      if (saved) {
        setCart(JSON.parse(saved))
      }

    } catch {}

  }, [])

  useEffect(() => {

    try {

      localStorage.setItem(
        'tenova10_cart',
        JSON.stringify(cart)
      )

    } catch {}

  }, [cart])

  function addToCart(product) {

    setCart(prev => {

      const existing = prev.find(
        p => p.id === product.id
      )

      if (existing) {

        return prev.map(p =>

          p.id === product.id

            ? {
                ...p,
                qty: p.qty + 1
              }

            : p

        )

      }

      return [

        ...prev,

        {
          ...product,
          qty: 1
        }

      ]

    })

  }

  function removeFromCart(id) {

    setCart(prev =>
      prev.filter(p => p.id !== id)
    )

  }

  function increaseQty(id) {

    setCart(prev =>
      prev.map(p =>
        p.id === id

          ? {
              ...p,
              qty: p.qty + 1
            }

          : p
      )
    )

  }

  function decreaseQty(id) {

    setCart(prev =>

      prev
        .map(p => {

          if (p.id !== id) return p

          return {

            ...p,

            qty: p.qty - 1

          }

        })

        .filter(p => p.qty > 0)

    )

  }

  const cartCount = cart.reduce(
    (sum, p) => sum + p.qty,
    0
  )

  const cartTotal = cart.reduce(
    (sum, p) => sum + p.qty * Number(p.price),
    0
  )

  return {

    cart,

    setCart,

    addToCart,

    removeFromCart,

    increaseQty,

    decreaseQty,

    cartCount,

    cartTotal,

  }

}