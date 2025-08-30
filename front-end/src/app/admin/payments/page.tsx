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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground">Payments</h2>
          <p className="text-sm sm:text-base text-muted-foreground">View and manage payment transactions</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={exportCsv} className="w-full sm:w-auto">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={load} className="w-full sm:w-auto">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Transactions</CardTitle>
            <Download className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{transactions.length}</div>
            <p className="text-xs text-muted-foreground">All transactions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Successful</CardTitle>
            <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{transactions.filter(t => t.status === 'success').length}</div>
            <p className="text-xs text-muted-foreground">Completed payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{transactions.filter(t => t.status === 'pending').length}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Failed</CardTitle>
            <XCircle className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg sm:text-2xl font-bold">{transactions.filter(t => t.status === 'failed').length}</div>
            <p className="text-xs text-muted-foreground">Failed transactions</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="list" className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list" className="text-xs sm:text-sm">Transactions</TabsTrigger>
          <TabsTrigger value="verify" className="text-xs sm:text-sm">Verify Payment</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Filters</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-8" placeholder="Search by user, email, tx ref, plan..." value={search} onChange={(e)=>setSearch(e.target.value)} />
                </div>
                <div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full sm:w-[160px]">
                          <SelectValue />
                        </SelectTrigger>
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
              </div>
            </CardContent>
          </Card>
          </div>

          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Transactions ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 animate-spin" />
                    <p className="text-sm">Loading transactions...</p>
                  </div>
              ) : filtered.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2" />
                    <p className="text-sm">No transactions found.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filtered.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium flex-shrink-0">
                            {transaction.user_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium truncate">{transaction.user_name}</div>
                            <div className="text-sm text-muted-foreground truncate">{transaction.user_email}</div>
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="flex items-center gap-2">
                            {statusBadge(transaction.status)}
                            <div className="text-sm font-medium">{formatCurrency(transaction.amount, transaction.currency)}</div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{transaction.tx_ref}</div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              {transaction.status === "success" && (
                                <DropdownMenuItem
                                  onClick={() => refund(transaction.id)}
                                  className="text-destructive"
                                >
                                  Issue Refund
                              </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
              )}
            </CardContent>
          </Card>
          </div>
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


