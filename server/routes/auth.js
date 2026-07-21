// Admin peut changer le code de n'importe quel utilisateur (préparateurs, caissiers, admin)
router.put('/change-code/:userId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { userId } = req.params
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Le code doit contenir au moins 4 caractères' })
    }
    const hashed = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, userId])
    res.json({ success: true, message: 'Code mis à jour' })
  } catch (error) {
    console.error('Erreur PUT /api/auth/change-code :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})

// Admin peut changer son propre code
router.put('/change-my-code', authMiddleware, async (req, res) => {
  try {
    const { newPassword, currentPassword } = req.body
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Le code doit contenir au moins 4 caractères' })
    }
    // Vérifier le mot de passe actuel
    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [req.user.id])
    const user = rows[0]
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' })
    
    const isMatch = await bcrypt.compare(currentPassword, user.password)
    if (!isMatch) return res.status(401).json({ error: 'Code actuel incorrect' })
    
    const hashed = await bcrypt.hash(newPassword, 10)
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashed, req.user.id])
    res.json({ success: true, message: 'Votre code a été mis à jour' })
  } catch (error) {
    console.error('Erreur PUT /api/auth/change-my-code :', error)
    res.status(500).json({ error: 'Erreur serveur' })
  }
})
