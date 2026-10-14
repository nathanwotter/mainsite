function Get-WeeklyDigestSpamDecision {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)]
        [pscustomobject]$Message
    )

    $protections = @(
        'prior_two_way_relationship',
        'requested_or_subscribed',
        'ongoing_business_relationship',
        'protected_correspondence'
    ) | Where-Object { $Message.protections.$_ -eq $true }

    if ($protections.Count -gt 0) {
        return [pscustomobject]@{
            name = $Message.name
            decision = 'keep'
            score = 0
            protections = @($protections)
            signals = @()
        }
    }

    $weights = [ordered]@{
        unsolicited_commercial = 2
        commercial_call_to_action = 2
        mass_outreach_language = 2
        generic_personalization = 1
        unrelated_recipient_account = 1
        deceptive_or_mismatched_identity = 3
        repeated_after_no_engagement = 2
        suspicious_or_misleading_content = 2
    }

    $score = 0
    $signals = @()
    foreach ($entry in $weights.GetEnumerator()) {
        if ($Message.signals.($entry.Key) -eq $true) {
            $score += $entry.Value
            $signals += $entry.Key
        }
    }

    $decision = if ($score -ge 4) {
        'archive'
    }
    elseif ($score -ge 2) {
        'review'
    }
    else {
        'keep'
    }

    [pscustomobject]@{
        name = $Message.name
        decision = $decision
        score = $score
        protections = @()
        signals = @($signals)
    }
}

Export-ModuleMember -Function Get-WeeklyDigestSpamDecision
