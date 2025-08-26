"use client"

import { useEffect, useMemo, useState } from "react"
import { adminApi } from "@/lib/admin-api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Download, MoreHorizontal, RefreshCw, Search, XCircle, CheckCircle, Clock, AlertTriangle } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface Txn {
  id: string
  user_id: string
  user_name: string
  user_email: string
  plan_name: string
  tx_ref: string
  ref_id?: string
  amount: number
  currency: string
  billing_cycle: "monthly" | "yearly"
  status: "pending" | "success" | "failed" | "cancelled"
  created_at: string
  updated_at: string
}

export default function PaymentsPage() {
  const [transactions, setTransactions] = useState<Txn[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [verifyRef, setVerifyRef] = useState("")
  const [verifyResult, setVerifyResult] = useState<any | null>(null)
  const [verifying, setVerifying] = useState(false)

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await adminApi.getTransactions()
      setTransactions(res.transactions as any)
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchesStatus = statusFilter === "all" || t.status === statusFilter
      const q = search.toLowerCase()
      const matchesSearch = !q ||
        t.user_name?.toLowerCase().includes(q) ||
        t.user_email?.toLowerCase().includes(q) ||
        t.tx_ref?.toLowerCase().includes(q) ||
        t.plan_name?.toLowerCase().includes(q)
      return matchesStatus && matchesSearch
    })
  }, [transactions, statusFilter, search])

  const exportCsv = () => {
    const header = ["tx_ref","user_name","user_email","plan_name","amount","currency","status","date"]
    const rows = filtered.map(t => [t.tx_ref, t.user_name, t.user_email, t.plan_name, String(t.amount), t.currency, t.status, t.created_at])
    const csv = [header, ...rows].map(r => r.map(v => `"${(v||"").toString().replace(/"/g,'""')}` + '"').join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `transactions.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const refund = async (id: string) => {
    try {
      await adminApi.refundTransaction(id)
      await load()
    } catch (e) {}
  }

  const verify = async (txRef: string) => {
    try {
      if (!txRef) {
        setVerifyResult({ error: 'This transaction has no tx_ref to verify.' })
        return
      }
      await adminApi.verifyTransaction(txRef)
      await load()
    } catch (e) {}
  }

  const handleManualVerify = async () => {
    if (!verifyRef) return
    setVerifying(true)
    setVerifyResult(null)
    try {
      const res = await adminApi.verifyTransaction(verifyRef)
      setVerifyResult(res)
      await load()
    } catch (e: any) {
      console.error('Verification error:', e)
      let errorMessage = "Verification failed"
      if (e?.details?.error) {
        errorMessage = e.details.error
      } else if (e?.details?.message) {
        errorMessage = e.details.message
      } else if (e?.message) {
        errorMessage = e.message
      }
      setVerifyResult({ 
        error: errorMessage,
        details: e?.details || e
      })
    } finally {
      setVerifying(false)
    }
  }

  const statusBadge = (s: string) => {
    const cls = s === 'success' ? 'bg-green-100 text-green-800' : s === 'pending' ? 'bg-yellow-100 text-yellow-800' : s === 'failed' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
    const Icon = s === 'success' ? CheckCircle : s === 'pending' ? Clock : s === 'failed' ? XCircle : AlertTriangle
    return <Badge className={cls}><span className="flex items-center gap-1"><Icon className="h-3 w-3" />{s.toUpperCase()}</span></Badge>
  }

  const formatCurrency = (amount: number, currency: string) => `${amount.toLocaleString()} ${currency}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Payments</h2>
          <p className="text-muted-foreground">View and manage payment transactions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Transactions</TabsTrigger>
          <TabsTrigger value="verify">Verify Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 flex-wrap">
                <div className="relative min-w-[240px] flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search by user, email, tx ref, plan..." value={search} onChange={(e)=>setSearch(e.target.value)} />
                </div>
                <div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="success">Success</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transactions ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center text-muted-foreground">Loading transactions...</div>
              ) : filtered.length === 0 ? (
                <div className="py-10 text-center text-muted-foreground">No transactions found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tx Ref</TableHead>
                      <TableHead>Ref ID</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-sm">{t.tx_ref}</TableCell>
                        <TableCell className="font-mono text-sm">{t.ref_id || '-'}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{t.user_name}</div>
                            <div className="text-sm text-muted-foreground">{t.user_email}</div>
                          </div>
                        </TableCell>
                        <TableCell>{t.plan_name}</TableCell>
                        <TableCell>{formatCurrency(t.amount, t.currency)}</TableCell>
                        <TableCell>{statusBadge(t.status)}</TableCell>
                        <TableCell>{new Date(t.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={()=>verify(t.tx_ref || '')} disabled={!t.tx_ref}>
                                Verify with Chapa {t.tx_ref ? '' : '(no tx_ref)'}
                              </DropdownMenuItem>
                              {t.status === 'success' && (
                                <DropdownMenuItem onClick={()=>refund(t.id)} className="text-red-600">Mark as refunded</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="verify">
          <Card>
            <CardHeader>
              <CardTitle>Verify Payment by Reference</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input placeholder="Enter tx_ref to verify" value={verifyRef} onChange={(e)=>setVerifyRef(e.target.value)} />
                <Button onClick={handleManualVerify} disabled={!verifyRef || verifying}>{verifying ? 'Verifying…' : 'Verify'}</Button>
              </div>
              {verifyResult && (
                <div className="text-sm">
                  {verifyResult.error ? (
                    <div className="space-y-2">
                      <div className="text-red-600 font-medium">{String(verifyResult.error)}</div>
                      {verifyResult.details && (
                        <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(verifyResult.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div>Updated Status: <Badge>{verifyResult.transaction?.status?.toUpperCase() || 'UNKNOWN'}</Badge></div>
                      <div className="text-muted-foreground">Chapa response received.</div>
                      {verifyResult.chapa && (
                        <div className="text-xs text-muted-foreground bg-green-50 p-2 rounded">
                          <pre className="whitespace-pre-wrap">{JSON.stringify(verifyResult.chapa, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}


